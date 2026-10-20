"""Cache transcripts by audio content, and space out real calls. Re-runs never spend credits."""

import hashlib
import json
import time
from pathlib import Path

from akshara.providers.base import SpeechToText


class CachedSTT:
    def __init__(self, inner: SpeechToText, folder: Path, min_interval_s: float = 1.5):
        self.inner = inner
        self.folder = folder
        self.min_interval_s = min_interval_s
        self.name = inner.name
        self.calls = 0  # real calls made, for tests and cost reports

    def transcribe(self, audio: Path, language: str) -> str:
        digest = hashlib.sha256(audio.read_bytes() + language.encode()).hexdigest()[:24]
        cached = self.folder / f"{digest}.json"
        if cached.exists():
            return json.loads(cached.read_text(encoding="utf-8"))["transcript"]
        text = self.inner.transcribe(audio, language)
        self.calls += 1
        self.folder.mkdir(parents=True, exist_ok=True)
        cached.write_text(
            json.dumps({"transcript": text, "language": language}, ensure_ascii=False),
            encoding="utf-8",
        )
        time.sleep(self.min_interval_s)  # other teams hit 429 on back-to-back calls
        return text
