"""Live end-to-end check: the real API app, real Prisma, existing Timbre clips.

Six paid calls: one clip per language, once as is and once through the 8 kHz phone band.

    uv run python scripts/live_check.py
"""

import io
import sys
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent))
from make_variants import phone, read_wav, write_wav  # noqa: E402

from akshara.api.app import create_app  # noqa: E402
from akshara.providers.prisma import PrismaSTT  # noqa: E402
from akshara.settings import ROOT, Settings  # noqa: E402

CLIPS = ["sw-204765", "sw-25737", "sw-591721"]


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    load_dotenv(ROOT / ".env")
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        c = TestClient(
            create_app(Settings(provider="prisma", db_path=Path(tmp) / "live.db"), PrismaSTT())
        )
        print(c.get("/health").json())
        for pid in CLIPS:
            src = ROOT / "data" / "open_passages" / "audio" / f"{pid}.wav"
            x, sr = read_wav(src)
            variants = {"clean": src.read_bytes()}
            px, psr = phone(x, sr)
            p8 = Path(tmp) / f"{pid}_8k.wav"
            write_wav(p8, px, psr)
            variants["phone8k"] = p8.read_bytes()
            for name, data in variants.items():
                r = c.post(
                    "/v1/attempts",
                    files={"audio": (f"{pid}.wav", io.BytesIO(data), "audio/wav")},
                    data={"learner": "live-check", "passage_id": pid},
                )
                if r.status_code != 200:
                    print(pid, name, "HTTP", r.status_code, r.text[:80])
                    continue
                b = r.json()
                ops = "".join(
                    {"correct": ".", "substituted": "x", "skipped": "-"}.get(w["op"], "+")
                    for w in b["words"]
                )
                print(
                    pid,
                    name,
                    f"acc={b['accuracy']:.2f}",
                    ops,
                    "checks:",
                    sum(w["check"] for w in b["words"]),
                )
        print(c.get("/v1/class/summary").json())


if __name__ == "__main__":
    main()
