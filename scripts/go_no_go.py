"""Week-1 go/no-go test: does Prisma's transcript show planted reading mistakes?

See docs/GO_NO_GO.md.

    uv run python scripts/go_no_go.py --dry-run     # no API calls; read_as is the transcript
    uv run python scripts/go_no_go.py --only hi-001 # one clip, to check credit cost
    uv run python scripts/go_no_go.py               # full run (transcripts are cached)
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

from akshara.align import score
from akshara.stt import transcribe
from akshara.text import words

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "go_no_go"
RESULTS = ROOT / "results"
CACHE = RESULTS / "transcripts"
MAX_CLIP_S = 30.0
CATCH_PASS, FALSE_FLAG_PASS = 0.70, 0.10


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
            if err["type"] not in ("skip", "substitution"):
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


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--passages", type=Path)
    ap.add_argument("--dry-run", action="store_true", help="use read_as as the transcript")
    ap.add_argument("--only", help="run one passage id")
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

    stats = defaultdict(
        lambda: {"passages": 0, "planted": 0, "caught": 0, "ok_words": 0, "false_flags": 0}
    )
    details = []
    for row in rows:
        duration = None
        if args.dry_run:
            transcript = row["read_as"]
        else:
            audio = DATA / "audio" / f"{row['id']}.wav"
            if not audio.exists():
                print(f"skip {row['id']}: no audio at {audio.relative_to(ROOT)}")
                continue
            duration = wav_seconds(audio)
            if duration and duration > MAX_CLIP_S:
                print(f"skip {row['id']}: {duration:.1f}s is over {MAX_CLIP_S:.0f}s")
                continue
            transcript = get_transcript(row, audio)

        s = score(row["reference"], transcript, duration)
        planted = {e["index"] for e in row.get("errors", [])}
        flagged = set(s.flagged_indexes)
        caught = planted & flagged
        false_flags = flagged - planted

        st = stats[row["lang"]]
        st["passages"] += 1
        st["planted"] += len(planted)
        st["caught"] += len(caught)
        st["ok_words"] += s.total_words - len(planted)
        st["false_flags"] += len(false_flags)
        details.append(
            {
                "id": row["id"],
                "lang": row["lang"],
                "transcript": transcript,
                "planted": sorted(planted),
                "flagged": sorted(flagged),
                "missed": sorted(planted - flagged),
                "false_flags": sorted(false_flags),
                "wcpm": s.wcpm,
            }
        )

    print(f"\n{'lang':<7}{'passages':>9}{'planted':>9}{'catch':>8}{'false-flag':>12}  result")
    summary = {}
    for lang, st in sorted(stats.items()):
        catch = st["caught"] / st["planted"] if st["planted"] else None
        ff = st["false_flags"] / st["ok_words"] if st["ok_words"] else None
        ok = catch is not None and catch >= CATCH_PASS and ff is not None and ff <= FALSE_FLAG_PASS
        summary[lang] = {**st, "catch_rate": catch, "false_flag_rate": ff, "pass": ok}
        c = f"{catch:.0%}" if catch is not None else "-"
        f = f"{ff:.0%}" if ff is not None else "-"
        print(
            f"{lang:<7}{st['passages']:>9}{st['planted']:>9}{c:>8}{f:>12}  "
            f"{'PASS' if ok else 'FAIL'}"
        )

    if not args.dry_run and details:
        RESULTS.mkdir(exist_ok=True)
        out = RESULTS / "go_no_go_report.json"
        out.write_text(
            json.dumps({"summary": summary, "passages": details}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"\nwrote {out.relative_to(ROOT)}")
    for d in details:
        if d["missed"] or d["false_flags"]:
            print(f"  {d['id']}: missed {d['missed']} false flags {d['false_flags']}")


if __name__ == "__main__":
    main()
