"""Run the benchmark over a manifest, with no API calls.

    uv run python scripts/bench.py --dry-run   # planted text as transcript: must be perfect
    uv run python scripts/bench.py --from-reports     # transcripts from committed study reports
    uv run python scripts/bench.py --from-reports --set open --split test

Writes results/bench/<name>.json (per-clip results and the summary) and prints a table per
condition and language. Clips with no transcript available are counted and left out.
"""

import argparse
import json
import sys
from functools import cache
from pathlib import Path

from akshara.bench import evaluate, summarise
from akshara.dataset import load

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "data" / "bench" / "manifest-v1.jsonl"


@cache
def report_transcripts(path: str) -> dict[str, str]:
    data = json.loads((ROOT / path).read_text(encoding="utf-8"))
    return {p["id"]: p["transcript"] for p in data["passages"]}


def main() -> None:
    ap = argparse.ArgumentParser()
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="read_as is the transcript")
    mode.add_argument("--from-reports", action="store_true", help="use committed transcripts")
    ap.add_argument("--manifest", type=Path, default=MANIFEST)
    ap.add_argument("--set", help="open, disfluency or v2")
    ap.add_argument("--split", help="tune, calibrate, test or holdout")
    ap.add_argument("--strict", action="store_true", help="strict spelling (default: loose)")
    ap.add_argument("--name", help="output name (default from the mode)")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")

    clips = [
        c
        for c in load(args.manifest)
        if (not args.set or c.set == args.set) and (not args.split or c.split == args.split)
    ]
    results, missing = [], 0
    for c in clips:
        if args.dry_run:
            text = c.read_as
        else:
            text = report_transcripts(c.report).get(c.passage_id) if c.report else None
        if text is None:
            missing += 1
            continue
        results.append(evaluate(c, text, loose=not args.strict))

    summary = summarise(results, by=("set", "condition", "lang"))
    name = args.name or ("dry_run" if args.dry_run else "from_reports")
    out = ROOT / "results" / "bench" / f"{name}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps({"summary": summary, "missing": missing, "clips": results}, ensure_ascii=False)
        + "\n",
        encoding="utf-8",
    )

    print(f"{len(results)} clips scored, {missing} without a transcript\n")
    for set_name, conds in summary.items():
        for cond, langs in conds.items():
            print(f"[{set_name} / {cond}]")
            for lang, r in langs.items():
                types = "  ".join(
                    f"{t} {v['caught']}/{v['planted']}" for t, v in r["by_type"].items()
                )
                flu = "  ".join(
                    f"{t} kept {v['kept']}/{v['planted'] - v['unmeasured']}"
                    + (f" (+{v['unmeasured']} unmeasured)" if v["unmeasured"] else "")
                    for t, v in r["fluency"].items()
                )
                ffr = r["false_flag_rate"]
                print(
                    f"  {lang}: caught {r['caught']}/{r['planted']}, "
                    f"false flags {r['false_flags']}/{r['ok_words']}"
                    + (f" ({ffr:.0%})" if ffr is not None else "")
                )
                if types:
                    print(f"    {types}")
                if flu:
                    print(f"    {flu}")
    print(f"\nwrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
