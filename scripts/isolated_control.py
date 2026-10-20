"""Control for the near-sound result: is the planted word actually pronounced, or does the
transcriber correct it?

Each planted near-sound word is synthesised alone (no sentence), then transcribed. With no
sentence around it, there is no context to correct from. Compare what comes back with the word we
asked the voice to say and with the original word.

    uv run python scripts/isolated_control.py --dry-run
    uv run python scripts/isolated_control.py
"""

import argparse
import json
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

from akshara.core.text import loose_key, words
from akshara.providers.cache import CachedSTT
from akshara.providers.prisma import PrismaSTT
from akshara.providers.timbre import VOICES, synthesize

ROOT = Path(__file__).resolve().parent.parent
DIR = ROOT / "data" / "open_passages"
OUT = DIR / "isolated"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    load_dotenv(ROOT / ".env")
    rows = [json.loads(x) for x in (DIR / "passages.jsonl").read_text("utf-8").splitlines()]
    voice_of = {r["id"]: VOICES[i % len(VOICES)] for i, r in enumerate(rows)}
    items = []
    for r in rows:
        ref = words(r["reference"])
        for e in r["errors"]:
            if e["type"] == "near":
                items.append((r["id"], r["lang"], ref[e["index"]], e["said"]))
    print(f"{len(items)} planted near-sound words")
    if args.dry_run:
        return
    stt = CachedSTT(PrismaSTT(), ROOT / "results" / "transcripts_isolated")
    OUT.mkdir(exist_ok=True)
    out = []
    for pid, lang, original, read in items:
        wav = OUT / f"{pid}.wav"
        if not wav.exists():
            wav.write_bytes(synthesize(read, lang, voice_of[pid], speed=0.9))
            time.sleep(1.5)
        try:
            heard = " ".join(words(stt.transcribe(wav, lang)))
        except Exception as e:  # a blocked or failed clip is reported, not hidden
            heard = f"<error: {str(e)[:40]}>"
        if heard.startswith("<error"):
            verdict = "error"
        elif loose_key(heard) == loose_key(read):
            verdict = "as_read"  # the non-word was pronounced and transcribed faithfully
        elif loose_key(heard) == loose_key(original):
            verdict = "corrected"  # came back as the original word
        else:
            verdict = "other"
        out.append(
            {"id": pid, "lang": lang, "original": original, "read": read, "heard": heard,
             "verdict": verdict}
        )  # fmt: skip
        print(f"{lang[:2]} {verdict:<9} original {original} read {read} heard {heard}")
    path = ROOT / "results" / "isolated_control.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    for lang in ("hi-IN", "kn-IN", "ta-IN"):
        v = [o["verdict"] for o in out if o["lang"] == lang]
        print(lang, {k: v.count(k) for k in ("as_read", "corrected", "other", "error")})


if __name__ == "__main__":
    main()
