"""Offline provider: replays recorded transcripts, so demos and tests need no API or credits."""

import json
from pathlib import Path

from akshara.providers.base import ProviderError


class FixtureSTT:
    name = "fixture"

    def __init__(self, transcripts: dict[str, str]):
        """`transcripts` maps an audio file name (or stem) to the text to return."""
        self.transcripts = transcripts

    @classmethod
    def from_cache(cls, folder: Path) -> "FixtureSTT":
        """Build from results/transcripts/<id>-<hash>.json files written by the study."""
        data = {}
        for f in sorted(folder.glob("*.json")):
            stem = f.stem.rsplit("-", 1)[0]
            data[stem] = json.loads(f.read_text(encoding="utf-8"))["transcript"]
        return cls(data)

    def transcribe(self, audio: Path, language: str) -> str:
        for key in (audio.name, audio.stem):
            if key in self.transcripts:
                return self.transcripts[key]
        raise ProviderError(f"no recorded transcript for {audio.name}")
