"""Make synthetic test audio for the go/no-go test: Timbre reads each passage's read_as.

Writes data/go_no_go/audio/<id>.wav. Clips already on disk are skipped, so re-runs cost nothing.

    uv run python scripts/make_test_audio.py --dry-run      # show what would be sent
    uv run python scripts/make_test_audio.py --only hi-101  # one clip, to check credit cost
    uv run python scripts/make_test_audio.py --speed 0.85   # slower, closer to a halting reader
"""

import argparse
import json
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

from akshara.tts import VOICES, synthesize

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "go_no_go"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--passages", type=Path, default=DATA / "passages.jsonl")
    ap.add_argument("--only", help="one passage id")
    ap.add_argument("--speed", type=float, default=0.9)
    ap.add_argument("--out-dir", type=Path, default=DATA / "audio")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    load_dotenv(ROOT / ".env")

    rows = [
        json.loads(line)
        for line in args.passages.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    if args.only:
        rows = [r for r in rows if r["id"] == args.only]
    out_dir = args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    # Variants of one sentence (-ok, -m, -d) share a voice, so only the words differ.
    def frame_of(row_id: str) -> str:
        return row_id.removesuffix("-ok").removesuffix("-m").removesuffix("-d")

    frames: dict[str, int] = {}
    for row in rows:
        frames.setdefault(frame_of(row["id"]), len(frames))

    chars = 0
    for row in rows:
        out = out_dir / f"{row['id']}.wav"
        voice = VOICES[frames[frame_of(row["id"])] % len(VOICES)]  # a different voice per sentence
        if out.exists():
            print(f"have {out.name}")
            continue
        chars += len(row["read_as"])
        if args.dry_run:
            print(f"would send {row['id']} ({voice}): {row['read_as']}")
            continue
        out.write_bytes(synthesize(row["read_as"], row["lang"], voice, speed=args.speed))
        print(f"wrote {out.name} ({voice})")
        time.sleep(1.5)  # other teams hit 429 on back-to-back calls
    print(f"{chars} characters {'to send' if args.dry_run else 'sent'}")


if __name__ == "__main__":
    main()
