"""The likely misreadings of a word, built from the script tables. No data, no model.

These are the alternatives the per-word acoustic check compares the story word against: if the
audio fits one of them better than the word itself, the word was probably misread.

Kinds: every single close-sound consonant change (any position), the two closest look-alike
consonants, vowel length, vowel sign, and conjuncts read apart. Spelling variants that the loose
rules treat as the same word are never alternatives.
"""

from akshara.core.plant import (
    conjunct_candidates,
    matra_candidates,
    visual_candidates,
    vowel_length_candidates,
)
from akshara.core.script import sound_neighbours
from akshara.core.text import loose_key


def sound_candidates(word: str, lang: str) -> list[tuple[str, str]]:
    out = []
    for i, ch in enumerate(word):
        for other, how in sound_neighbours(ch, lang):
            cand = word[:i] + other + word[i + 1 :]
            if loose_key(cand) != loose_key(word):
                out.append((cand, f"{how} {ch}->{other}"))
    return out


def confusions(word: str, lang: str) -> dict[str, str]:
    """Alternative spoken forms of `word`, each with what changed."""
    out: dict[str, str] = {}
    for kind, gen in (
        ("sound", sound_candidates),
        ("visual", visual_candidates),
        ("vowel_length", vowel_length_candidates),
        ("matra", matra_candidates),
        ("conjunct", conjunct_candidates),
    ):
        for cand, detail in gen(word, lang):
            out.setdefault(cand, f"{kind}: {detail}")
    return out
