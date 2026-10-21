"""Cache synthesised audio by content, so repeating a word never costs credits."""

import hashlib
from pathlib import Path

from akshara.providers.base import TextToSpeech


class CachedTTS:
    """Wraps a TextToSpeech and writes each clip once, keyed by text+language+voice."""

    def __init__(self, inner: TextToSpeech, folder: Path, default_voice: str = "Shivani"):
        self.inner = inner
        self.folder = folder
        self.default_voice = default_voice
        self.name = inner.name
        self.calls = 0  # real (paid) calls made, for tests and cost reports

    def synthesize(self, text: str, language: str, voice: str | None = None) -> bytes:
        chosen = voice or self.default_voice
        digest = hashlib.sha256(f"{text}\0{language}\0{chosen}".encode()).hexdigest()[:24]
        cached = self.folder / f"{digest}.wav"
        if cached.exists():
            return cached.read_bytes()

        audio = self.inner.synthesize(text, language, chosen)
        self.calls += 1
        self.folder.mkdir(parents=True, exist_ok=True)
        cached.write_bytes(audio)
        return audio
