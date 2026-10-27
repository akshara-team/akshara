"""Week-1 go/no-go test: does Prisma's transcript show planted reading mistakes?

See docs/GO_NO_GO.md.

    uv run python scripts/go_no_go.py --dry-run     # no API calls; read_as is the transcript
    uv run python scripts/go_no_go.py --only hi-001 # one clip, to check credit cost
    uv run python scripts/go_no_go.py               # full run (transcripts are cached)
    uv run python scripts/go_no_go.py --variant phone8k   # a stress variant
"""

import argparse
import hashlib
import json
import sys
import time
import wave
from collections import defaultdict
from pathlib import Path

from dotenv import load_dotenv

from akshara.core.align import insertion_near, score
from akshara.core.plant import DISFLUENCY_V2 as DISFLUENCY  # every fluency kind, old and new
from akshara.core.plant import TYPES_V2
from akshara.core.text import words
from akshara.providers.prisma import STTError, transcribe

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "go_no_go"
RESULTS = ROOT / "results"
CACHE = RESULTS / "transcripts"
MAX_CLIP_S = 30.0
CATCH_PASS, FALSE_FLAG_PASS = 0.70, 0.10
ERROR_TYPES = ("substitution", *TYPES_V2, *DISFLUENCY)


def load_passages(path: Path) -> list[dict]:
    rows = []
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        row = json.loads(line)
        n_words = len(words(row["reference"]))
        for err in row.get("errors", []):
            if not 0 <= err["index"] < n_words:
                sys.exit(f"{path.name}:{n} {row['id']}: error index {err['index']} out of range")
            if err["type"] not in ERROR_TYPES:
                sys.exit(f"{path.name}:{n} {row['id']}: unknown error type {err['type']!r}")
        rows.append(row)
    return rows


def wav_seconds(path: Path) -> float | None:
    try:
        with wave.open(str(path)) as w:
            return w.getnframes() / w.getframerate()
    except (wave.Error, EOFError):
        return None


def get_transcript(row: dict, audio: Path) -> str:
    """Cached by audio content, so re-runs never spend credits."""
    digest = hashlib.sha256(audio.read_bytes()).hexdigest()[:16]
    cached = CACHE / f"{row['id']}-{digest}.json"
    if cached.exists():
        return json.loads(cached.read_text(encoding="utf-8"))["transcript"]
    body = transcribe(audio, row["lang"])
    CACHE.mkdir(parents=True, exist_ok=True)
    cached.write_text(json.dumps(body, ensure_ascii=False, indent=2), encoding="utf-8")
    time.sleep(1.5)  # other teams hit 429 on back-to-back calls
    return body["transcript"]


MODES = {"strict": False, "loose": True}


def new_stats() -> dict:
    return {
        "passages": 0,
        "planted": 0,
        "caught": 0,
        "ok_words": 0,
        "false_flags": 0,
        "by_type": {},
    }


def summarise(stats: dict) -> dict:
    out = {}
    for lang, st in sorted(stats.items()):
        catch = st["caught"] / st["planted"] if st["planted"] else None
        ff = st["false_flags"] / st["ok_words"] if st["ok_words"] else None
        ok = catch is not None and catch >= CATCH_PASS and ff is not None and ff <= FALSE_FLAG_PASS
        out[lang] = {**st, "catch_rate": catch, "false_flag_rate": ff, "pass": ok}
    return out


def print_table(title: str, summary: dict) -> None:
    print(f"\n[{title}]")
    print(f"{'lang':<7}{'passages':>9}{'planted':>9}{'catch':>8}{'false-flag':>12}  result")
    for lang, r in summary.items():
        c = f"{r['catch_rate']:.0%}" if r["catch_rate"] is not None else "-"
        f = f"{r['false_flag_rate']:.0%}" if r["false_flag_rate"] is not None else "-"
        print(
            f"{lang:<7}{r['passages']:>9}{r['planted']:>9}{c:>8}{f:>12}  "
            f"{'PASS' if r['pass'] else 'FAIL'}"
        )


def print_types(summary: dict) -> None:
    kinds = sorted({k for r in summary.values() for k in r["by_type"]})
    if not kinds:
        return
    print(f"{'lang':<7}" + "".join(f"{k:>14}" for k in kinds))
    for lang, r in summary.items():
        cells = []
        for k in kinds:
            t = r["by_type"].get(k)
            cells.append(f"{t['caught']}/{t['planted']}" if t else "-")
        print(f"{lang:<7}" + "".join(f"{c:>14}" for c in cells))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--passages", type=Path)
    ap.add_argument("--dry-run", action="store_true", help="use read_as as the transcript")
    ap.add_argument("--only", help="run one passage id")
    ap.add_argument(
        "--variant",
        default="base",
        help="audio set to test: 'base' or a folder name under data/go_no_go/audio_variants/",
    )
    ap.add_argument("--audio-dir", type=Path, help="override the folder the clips are read from")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")  # Windows consoles default to cp1252
    load_dotenv(ROOT / ".env")

    path = args.passages or DATA / "passages.jsonl"
    if not path.exists():
        path = DATA / "passages.example.jsonl"
        print(f"passages.jsonl not found, using {path.name}")
    rows = load_passages(path)
    if args.only:
        rows = [r for r in rows if r["id"] == args.only]
    audio_dir = args.audio_dir or (
        DATA / "audio" if args.variant == "base" else DATA / "audio_variants" / args.variant
    )

    stats = {m: defaultdict(new_stats) for m in MODES}
    details = []
    skipped: list[str] = []
    for row in rows:
        duration = None
        if args.dry_run:
            transcript = row["read_as"]
        else:
            audio = audio_dir / f"{row['id']}.wav"
            if not audio.exists():
                print(f"skip {row['id']}: no audio at {audio.relative_to(ROOT)}")
                continue
            duration = wav_seconds(audio)
            if duration and duration > MAX_CLIP_S:
                print(f"skip {row['id']}: {duration:.1f}s is over {MAX_CLIP_S:.0f}s")
                continue
            try:
                transcript = get_transcript(row, audio)
            except STTError as e:
                print(f"skip {row['id']}: {str(e)[:90]}")
                skipped.append(row["id"])
                continue

        kind_at = {e["index"]: e["type"] for e in row.get("errors", [])}
        planted = {i for i, k in kind_at.items() if k not in DISFLUENCY}
        fluency = {i for i, k in kind_at.items() if k in DISFLUENCY}
        detail = {"id": row["id"], "lang": row["lang"], "transcript": transcript}
        for mode, loose in MODES.items():
            s = score(row["reference"], transcript, duration, loose=loose)
            flagged = set(s.flagged_indexes) - fluency
            caught = planted & flagged
            false_flags = flagged - planted
            st = stats[mode][row["lang"]]
            st["passages"] += 1
            st["planted"] += len(planted)
            st["caught"] += len(caught)
            st["ok_words"] += s.total_words - len(planted) - len(fluency)
            st["false_flags"] += len(false_flags)
            for idx, kind in kind_at.items():
                t = st["by_type"].setdefault(kind, {"planted": 0, "caught": 0})
                t["planted"] += 1
                # a fluency event is "caught" when the transcript kept the extra word
                t["caught"] += insertion_near(s.marks, idx) if idx in fluency else idx in flagged
            detail[mode] = {
                "planted": sorted(planted),
                "flagged": sorted(flagged),
                "missed": sorted(planted - flagged),
                "false_flags": sorted(false_flags),
                "wcpm": s.wcpm,
            }
        details.append(detail)

    summary = {m: summarise(stats[m]) for m in MODES}
    for mode in MODES:
        print_table(f"{args.variant} / {mode}", summary[mode])
        print_types(summary[mode])

    if not args.dry_run and details:
        RESULTS.mkdir(exist_ok=True)
        name = "go_no_go_report.json" if args.variant == "base" else f"go_no_go_{args.variant}.json"
        out = RESULTS / name
        out.write_text(
            json.dumps(
                {"summary": summary, "skipped": skipped, "passages": details},
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        print(f"\nwrote {out.relative_to(ROOT)}")
    for d in details:
        for mode in MODES:
            m = d[mode]
            if m["missed"] or m["false_flags"]:
                print(f"  {mode:<6} {d['id']}: missed {m['missed']} false flags {m['false_flags']}")


if __name__ == "__main__":
    main()
