"""Render benchmark audio that is listed in the manifest but not on disk yet, with Timbre.

Each clip is read with its manifest voice and speed. A clip with a planted long pause
("hesitation") is synthesised in pieces split at that word and joined with the planted silence,
since a speech engine will not pause on request. Clips already on disk are skipped, so re-runs cost
nothing. Every call goes through the ledger cap.

    uv run python scripts/render_manifest.py --dry-run          # what would be sent, no calls
    uv run python scripts/render_manifest.py --set v2 --limit 1 # one clip, to check it
    uv run python scripts/render_manifest.py --set v2
"""

import argparse
import io
import sys
import time
import wave
from pathlib import Path

import numpy as np
from dotenv import load_dotenv

from akshara.core.text import words
from akshara.core.wavio import write_wav
from akshara.dataset import Clip, load
from akshara.providers.timbre import synthesize

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "data" / "bench" / "manifest-v1.jsonl"
RATE = 16000


def spoken_by_word(clip: Clip) -> list[str]:
    """What the reader says for each story word ("" for a skip); joins back to read_as."""
    out = list(words(clip.reference))
    for e in clip.errors:
        out[e["index"]] = e.get("said", "")
    if " ".join(w for w in out if w) != clip.read_as:
        raise ValueError(f"{clip.clip_id}: errors do not rebuild read_as")
    return out


def pieces(clip: Clip) -> list[tuple[str, float]]:
    """(text, silence after it in seconds) for each piece to synthesise."""
    spoken = spoken_by_word(clip)
    pauses = {e["index"]: e["pause_s"] for e in clip.errors if e["type"] == "hesitation"}
    out, current = [], []
    for i, w in enumerate(spoken):
        if i in pauses and current:
            out.append((" ".join(current), pauses[i]))
            current = []
        if w:
            current.append(w)
    out.append((" ".join(current), 0.0))
    return out


def render(clip: Clip) -> np.ndarray:
    parts = []
    for text, silence in pieces(clip):
        wav = synthesize(text, clip.lang, clip.voice, speed=clip.speed or 1.0, sample_rate=RATE)
        with wave.open(io.BytesIO(wav)) as w:
            if (w.getframerate(), w.getnchannels(), w.getsampwidth()) != (RATE, 1, 2):
                raise ValueError(f"{clip.clip_id}: expected 16 kHz mono 16-bit audio")
            x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
        parts += [x, np.zeros(int(silence * RATE), dtype=np.int16)]
        time.sleep(1.0)
    return np.concatenate(parts)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", type=Path, default=MANIFEST)
    ap.add_argument("--set", help="only this passage set")
    ap.add_argument("--limit", type=int, help="render at most this many clips")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    load_dotenv(ROOT / ".env")

    todo = [
        c
        for c in load(args.manifest)
        if c.audio
        and not c.conditions
        and c.engine.startswith("timbre")
        and (not args.set or c.set == args.set)
        and not (ROOT / c.audio).exists()
    ]
    if args.limit:
        todo = todo[: args.limit]
    calls = sum(len(pieces(c)) for c in todo)
    print(f"{len(todo)} clips to render, {calls} Timbre calls")
    for c in todo:
        if args.dry_run:
            print(f"would render {c.passage_id} ({c.voice}): {pieces(c)}")
            continue
        write_wav(ROOT / c.audio, render(c), RATE)
        print(f"wrote {c.audio} ({c.voice}, {len(pieces(c))} piece(s))")


if __name__ == "__main__":
    main()
