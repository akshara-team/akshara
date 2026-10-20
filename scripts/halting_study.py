"""Halting-audio test: whole-clip transcript vs chunked re-check, on the same clips.

Predictions are in docs/PREDICTIONS.md. Needs data/open_passages/halting/*.wav
(scripts/make_halting_audio.py). Transcripts are cached, so re-runs cost nothing.

    uv run python scripts/halting_study.py --dry-run   # list what would be sent
    uv run python scripts/halting_study.py
"""

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

from dotenv import load_dotenv
from scipy.stats import binomtest

from akshara.core.align import score
from akshara.core.stats import wilson
from akshara.mitigation import chunked_transcript
from akshara.providers.cache import CachedSTT
from akshara.providers.prisma import PrismaSTT, STTError

ROOT = Path(__file__).resolve().parent.parent
DIR = ROOT / "data" / "open_passages"
HALT = DIR / "halting"
CACHE = ROOT / "results" / "transcripts_halting"
MODES = {"strict": False, "loose": True}


def pct(k: int, n: int) -> str:
    lo, hi = wilson(k, n)
    return f"{k}/{n} ({k / n:.0%}, {lo:.0%}-{hi:.0%})" if n else "-"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    load_dotenv(ROOT / ".env")
    rows = {
        r["id"]: r
        for r in map(json.loads, (DIR / "passages.jsonl").read_text("utf-8").splitlines())
    }
    manifest = [json.loads(x) for x in (HALT / "manifest.jsonl").read_text("utf-8").splitlines()]
    if args.dry_run:
        print(f"{len(manifest)} clips; {sum(m['chunks'] for m in manifest)} chunk calls expected")
        return
    stt = CachedSTT(PrismaSTT(), CACHE)
    detail = []
    skipped: list[str] = []
    for m in manifest:
        row = rows[m["id"]]
        audio = HALT / f"{m['id']}.wav"
        try:
            whole = stt.transcribe(audio, row["lang"])
            chunked, pieces = chunked_transcript(stt, audio, row["lang"])
        except STTError as e:  # a blocked clip is listed, not allowed to stop the study
            skipped.append(m["id"])
            print(f"skip {m['id']}: {str(e)[:60]}")
            continue
        detail.append(
            {
                "id": m["id"],
                "lang": row["lang"],
                "expected_pieces": m["chunks"],
                "pieces": pieces,
                "whole": whole,
                "chunked": chunked,
            }
        )
        print(f"{m['id']}: {pieces}/{m['chunks']} pieces")
    out = ROOT / "results" / "halting_study.json"
    out.write_text(
        json.dumps({"skipped": skipped, "clips": detail}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    if skipped:
        print("skipped (blocked or failed):", ", ".join(skipped))

    found = sum(d["pieces"] == d["expected_pieces"] for d in detail)
    print(f"\npause finder found the right number of pieces in {pct(found, len(detail))} clips")
    for mode, loose in MODES.items():
        print(f"\n[{mode}] caught / planted (95% interval)")
        tally = defaultdict(lambda: defaultdict(lambda: {"planted": 0, "whole": 0, "chunked": 0}))
        ff = defaultdict(lambda: {"words": 0, "whole": 0, "chunked": 0})
        discord = defaultdict(lambda: [0, 0])  # [chunked only, whole only]
        for d in detail:
            row = rows[d["id"]]
            kinds = {e["index"]: e["type"] for e in row["errors"]}
            res = {}
            for way in ("whole", "chunked"):
                s = score(row["reference"], d[way], loose=loose)
                res[way] = set(s.flagged_indexes)
            for idx, kind in kinds.items():
                for key in (kind, "all"):
                    t = tally[d["lang"]][key]
                    t["planted"] += 1
                    for way in ("whole", "chunked"):
                        t[way] += idx in res[way]
                if kind in ("near", "distant"):
                    discord[kind][0] += idx in res["chunked"] and idx not in res["whole"]
                    discord[kind][1] += idx in res["whole"] and idx not in res["chunked"]
            n_ok = len(row["reference"].split()) - len(kinds)
            for way in ("whole", "chunked"):
                ff[d["lang"]][way] += len(res[way] - set(kinds))
            ff[d["lang"]]["words"] += n_ok
        for lang in sorted(tally):
            for key in ("near", "distant", "skip", "half", "all"):
                t = tally[lang].get(key)
                if t:
                    print(
                        f"{lang} {key:<8} whole {pct(t['whole'], t['planted']):<26}"
                        f" chunked {pct(t['chunked'], t['planted'])}"
                    )
        for lang in sorted(ff):
            f = ff[lang]
            print(
                f"{lang} false flags: whole {pct(f['whole'], f['words'])}"
                f" chunked {pct(f['chunked'], f['words'])}"
            )
        for kind, (c_only, w_only) in discord.items():
            n = c_only + w_only
            p = binomtest(c_only, n).pvalue if n else 1.0
            print(
                f"{kind}: chunked-only catches {c_only}, whole-only {w_only}, sign test p = {p:.2f}"
            )
    print(f"\nwrote {out.relative_to(ROOT)}; Prisma calls made this run: {stt.calls}")


if __name__ == "__main__":
    main()
