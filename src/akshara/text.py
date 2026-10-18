"""Text normalisation and word splitting for Hindi, Kannada and Tamil."""

import unicodedata

# Zero-width joiner / non-joiner change how a word renders, not what it says.
_ZERO_WIDTH = {"‌", "‍", "﻿"}


def _is_punct(ch: str) -> bool:
    # Covers ASCII punctuation, quotes, and the danda / double danda (U+0964, U+0965).
    return unicodedata.category(ch).startswith("P") or unicodedata.category(ch) == "Sm"


def normalize(text: str) -> str:
    """NFC-normalise, drop punctuation and zero-width characters, lowercase Latin."""
    text = unicodedata.normalize("NFC", text)
    out = []
    for ch in text:
        if ch in _ZERO_WIDTH:
            continue
        out.append(" " if _is_punct(ch) else ch)
    return " ".join("".join(out).lower().split())


def words(text: str) -> list[str]:
    """Split text into normalised words."""
    return normalize(text).split()
