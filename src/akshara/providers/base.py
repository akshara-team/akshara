"""Interfaces the service depends on, so a provider can be swapped without touching the scorer."""

from pathlib import Path
from typing import Protocol


class ProviderError(RuntimeError):
    """A speech provider failed or refused a request."""


class SpeechToText(Protocol):
    name: str

    def transcribe(self, audio: Path, language: str) -> str: ...


class TextToSpeech(Protocol):
    name: str

    def synthesize(self, text: str, language: str, voice: str) -> bytes: ...
