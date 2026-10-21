"""Record go/no-go audio clip by clip, named by passage id.

Needs the `sounddevice` package, which is not a project dependency. Run it as:

    uv run --with sounddevice python scripts/record.py --lang kn-IN
    uv run --with sounddevice python scripts/record.py --lang ta-IN

For each passage it shows the `read_as` line, waits for you to press Enter to
start, and records until you press Enter again (hard stop at 30 s). Clips are
written to data/go_no_go/audio/<id>.wav as 16-bit mono 16 kHz. Read at a
child-like slow pace, mistakes included. Adults only, your own voice.
"""

import argparse
import json
import sys
import threading
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "go_no_go"
AUDIO = DATA / "audio"
RATE = 16000
CHANNELS = 1
MAX_S = 30.0


def load_rows(path: Path, langs: set[str]) -> list[dict]:
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            row = json.loads(line)
            if row["lang"] in langs:
                rows.append(row)
    return rows


def record(path: Path, sounddevice) -> float:
    stop = threading.Event()

    def wait_for_enter() -> None:
        input()
        stop.set()

    threading.Thread(target=wait_for_enter, daemon=True).start()
    frames = 0
    limit = int(MAX_S * RATE)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(CHANNELS)
        w.setsampwidth(2)
        w.setframerate(RATE)
        stream = sounddevice.RawInputStream(samplerate=RATE, channels=CHANNELS, dtype="int16")
        with stream:
            while not stop.is_set() and frames < limit:
                data, _ = stream.read(1024)
                w.writeframes(data)
                frames += 1024
    return frames / RATE


def main() -> None:
    ap = argparse.ArgumentParser(description="Record go/no-go clips as <id>.wav")
    ap.add_argument("--lang", default="kn-IN,ta-IN", help="comma-separated language codes")
    ap.add_argument("--passages", type=Path, default=DATA / "passages.jsonl")
    ap.add_argument("--force", action="store_true", help="re-record clips that already exist")
    args = ap.parse_args()

    try:
        import sounddevice
    except ImportError:
        sys.exit("sounddevice is missing. Run: uv run --with sounddevice python scripts/record.py")

    langs = {s.strip() for s in args.lang.split(",") if s.strip()}
    rows = load_rows(args.passages, langs)
    AUDIO.mkdir(parents=True, exist_ok=True)
    todo = [r for r in rows if args.force or not (AUDIO / f"{r['id']}.wav").exists()]
    print(f"{len(todo)} of {len(rows)} clips to record\n")

    for row in todo:
        path = AUDIO / f"{row['id']}.wav"
        print(f"[{row['id']}] {row['read_as']}")
        input("  press Enter to start")
        duration = record(path, sounddevice)
        print(f"  saved {path.name} ({duration:.1f}s)\n")

    print("done")


if __name__ == "__main__":
    main()
