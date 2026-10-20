"""Build halting-reader audio: read_as in chunks of 3 words, each synthesised alone, joined with
silence. Prisma gives no word timings, so the chunked re-check cuts at these pauses.

Picks 15 passages per language that contain a near-sound or distant swap. Chunks are cached on
disk, so an interrupted run resumes without repeat calls.

    uv run python scripts/make_halting_audio.py --dry-run
    uv run python scripts/make_halting_audio.py
"""

import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

import numpy as np
from dotenv import load_dotenv

from akshara.core.wavio import read_wav, write_wav
from akshara.providers.timbre import VOICES, synthesize

ROOT = Path(__file__).resolve().parent.parent
DIR = ROOT / "data" / "open_passages"
OUT = DIR / "halting"
CHUNK_WORDS, GAP_S, PER_LANG, RATE = 3, 0.35, 15, 16000


def rank(pid: str) -> str:
    return hashlib.sha256(pid.encode()).hexdigest()


def chunks(text: str) -> list[str]:
    w = text.split()
    return [" ".join(w[i : i + CHUNK_WORDS]) for i in range(0, len(w), CHUNK_WORDS)]


def select(rows: list[dict]) -> list[dict]:
    out = []
    for lang in ("hi-IN", "kn-IN", "ta-IN"):
        pool = [
            r
            for r in rows
            if r["lang"] == lang and any(e["type"] in ("near", "distant") for e in r["errors"])
        ]
        out += sorted(pool, key=lambda r: rank(r["id"]))[:PER_LANG]
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    load_dotenv(ROOT / ".env")
    rows = [json.loads(x) for x in (DIR / "passages.jsonl").read_text("utf-8").splitlines()]
    voice_of = {r["id"]: VOICES[i % len(VOICES)] for i, r in enumerate(rows)}  # same as base audio
    picked = select(rows)
    n_chunks = sum(len(chunks(r["read_as"])) for r in picked)
    print(f"{len(picked)} passages, {n_chunks} chunks to synthesise")
    if args.dry_run:
        return
    (OUT).mkdir(parents=True, exist_ok=True)
    manifest = []
    gap = np.zeros(int(RATE * GAP_S), dtype=np.int16)
    for r in picked:
        parts = []
        for k, text in enumerate(chunks(r["read_as"])):
            tag = hashlib.sha256(text.encode()).hexdigest()[:8]  # a changed chunk is a new file
            f = OUT / "chunks" / f"{r['id']}-{k}-{tag}.wav"
            if not f.exists():
                f.parent.mkdir(parents=True, exist_ok=True)
                f.write_bytes(synthesize(text, r["lang"], voice_of[r["id"]], speed=0.9))
                time.sleep(1.5)
            samples, rate = read_wav(f)
            assert rate == RATE, f"{f.name}: {rate} Hz"
            parts += [samples, gap]
        write_wav(OUT / f"{r['id']}.wav", np.concatenate(parts[:-1]), RATE)
        manifest.append({"id": r["id"], "chunks": len(parts) // 2})
        print(f"wrote {r['id']} ({len(parts) // 2} chunks)")
    (OUT / "manifest.jsonl").write_text(
        "".join(json.dumps(m) + "\n" for m in manifest), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
