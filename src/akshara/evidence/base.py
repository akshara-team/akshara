"""The one interface every evidence source implements.

An evidence source takes a recording and the story words and returns, per story word, what it
found: timings and how well the audio fits the word. Sources never decide "correct" or "wrong";
that happens in one place, the fusion step (Phase 3), so sources can be swapped and compared on
the benchmark.
"""

from pathlib import Path
from typing import Protocol

from akshara.evidence.words import WordEvidence


class EvidenceSource(Protocol):
    name: str

    def evidence(self, audio: Path, lang: str, words: list[str]) -> list[WordEvidence] | None:
        """Per-word evidence, or None when the story cannot be aligned to the audio."""
        ...
