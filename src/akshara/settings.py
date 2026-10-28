"""Typed settings read from the environment. Secrets never have defaults."""

import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    provider: str = "fixture"  # "prisma" or "fixture"
    db_path: Path = ROOT / "results" / "akshara.sqlite"
    max_upload_bytes: int = 3_000_000  # 90 s of 16 kHz 16-bit mono
    max_audio_seconds: float = 90.0  # a slow reader needs a minute for 20 words
    # Recordings kept for the teacher's review; None keeps them next to the database
    # (`recordings/`), and an in-memory database keeps none.
    recordings_dir: Path | None = None
    # Recordings older than this are deleted; the reading's words and scores stay.
    retention_days: float = 30.0

    @property
    def recordings(self) -> Path | None:
        if self.recordings_dir is not None:
            return self.recordings_dir
        if str(self.db_path) == ":memory:":
            return None
        return Path(self.db_path).parent / "recordings"

    @classmethod
    def from_env(cls) -> "Settings":
        env = os.environ
        return cls(
            provider=env.get("AKSHARA_PROVIDER", "fixture"),
            db_path=Path(env.get("AKSHARA_DB", cls.db_path)),
            max_upload_bytes=int(env.get("AKSHARA_MAX_UPLOAD", cls.max_upload_bytes)),
            max_audio_seconds=float(env.get("AKSHARA_MAX_AUDIO_S", cls.max_audio_seconds)),
            recordings_dir=Path(env["AKSHARA_RECORDINGS"])
            if env.get("AKSHARA_RECORDINGS")
            else None,
            retention_days=float(env.get("AKSHARA_RETENTION_DAYS", cls.retention_days)),
        )
