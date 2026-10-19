"""Text normalisation and word splitting for Hindi, Kannada and Tamil."""

import re
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


_NUKTA = "़"
_CHANDRABINDU, _ANUSVARA = "ँ", "ं"
_HINDI_VARIANTS = {"वह": "वो"}  # वह -> वो
# Tamil writes sandhi (joining) consonants onto the previous word; speech-to-text drops them.
_TAMIL_SANDHI_END = re.compile("[கசதப]்$")  # க ச த ப + pulli


def loose_key(word: str) -> str:
    """Spelling-variant-insensitive form of a word, for the optional 'loose' comparison.

    Hindi: drops nukta, treats chandrabindu as anusvara, treats वह and वो as one word.
    Tamil: drops a trailing sandhi consonant (கடைக்குச் == கடைக்கு).
    Other scripts, Kannada included, are left strict because vowel length changes meaning.
    """
    word = word.replace(_NUKTA, "").replace(_CHANDRABINDU, _ANUSVARA)
    word = _HINDI_VARIANTS.get(word, word)
    if len(word) > 2 and "஀" <= word[0] <= "௿":
        word = _TAMIL_SANDHI_END.sub("", word)
    return word
