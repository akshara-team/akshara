"""Run the acoustic model over every benchmark clip with audio, and save per-word evidence.

No API calls and no credits: the model runs locally. Emissions are cached in results/emissions/
(git-ignored), so a re-run only re-does the cheap part. The output,
results/evidence_mms.jsonl, is committed: one line per clip with the model's free transcript and
each story word's timing and fit scores (src/akshara/evidence/words.py).

    uv run --group evidence python scripts/evidence_study.py --limit 3     # smoke test
    uv run --group evidence python scripts/evidence_study.py
"""

import argparse
import json
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

from akshara.core.text import words
from akshara.dataset import load
from akshara.evidence.mms import MMS
from akshara.evidence.words import check, transcript

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "data" / "bench" / "manifest-v1.jsonl"
OUT = ROOT / "results" / "evidence_mms.jsonl"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", type=Path, default=MANIFEST)
    ap.add_argument("--set", help="only this passage set")
    ap.add_argument("--limit", type=int)
    ap.add_argument("--out", type=Path, default=OUT)
    args = ap.parse_args()
    args.out = args.out.resolve()
    sys.stdout.reconfigure(encoding="utf-8")
    load_dotenv(ROOT / ".env")  # HF_HOME, so the model download lands where there is space

    clips = [
        c
        for c in load(args.manifest)
        if c.audio and (ROOT / c.audio).exists() and (not args.set or c.set == args.set)
    ]
    clips.sort(key=lambda c: c.lang)  # one adapter switch per language
    if args.limit:
        clips = clips[: args.limit]
    model = MMS(cache_dir=ROOT / "results" / "emissions")
    rows, t0 = [], time.time()
    for n, c in enumerate(clips, 1):
        em = model.emissions(ROOT / c.audio, c.lang)
        ev = check(em, words(c.reference), c.lang)
        rows.append(
            {
                "clip_id": c.clip_id,
                "frames": len(em.logp),
                "transcript": transcript(em),
                "aligned": ev is not None,
                "words": [w.to_json() for w in ev] if ev else [],
            }
        )
        if n % 20 == 0 or n == len(clips):
            print(f"{n}/{len(clips)} clips, {time.time() - t0:.0f} s")
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8"
    )
    failed = sum(not r["aligned"] for r in rows)
    print(f"wrote {args.out.relative_to(ROOT)}: {len(rows)} clips, {failed} could not be aligned")


if __name__ == "__main__":
    main()
