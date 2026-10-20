"""Typed settings read from the environment. Secrets never have defaults."""

import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    provider: str = "fixture"  # "prisma" or "fixture"
    db_path: Path = ROOT / "results" / "akshara.sqlite"
    max_upload_bytes: int = 2_000_000
    max_audio_seconds: float = 30.0

    @classmethod
    def from_env(cls) -> "Settings":
        env = os.environ
        return cls(
            provider=env.get("AKSHARA_PROVIDER", "fixture"),
            db_path=Path(env.get("AKSHARA_DB", cls.db_path)),
            max_upload_bytes=int(env.get("AKSHARA_MAX_UPLOAD", cls.max_upload_bytes)),
            max_audio_seconds=float(env.get("AKSHARA_MAX_AUDIO_S", cls.max_audio_seconds)),
        )
