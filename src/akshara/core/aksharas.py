"""Split a word into aksharas (written syllables) and take one apart.

An akshara is what a child learns as one unit: a consonant or conjunct with its vowel sign and
marks (स्कू, ಪು, டை), or an independent vowel (अ, ಇ). Unicode grapheme clusters do not join
conjuncts across the virama for Kannada or Tamil, so this is done here.

Tamil is different: a consonant with pulli (க்) is a letter of its own, so it never joins the next
consonant, except in the conjunct க்ஷ.
"""

import unicodedata
from dataclasses import dataclass

from akshara.core.script import independent_vowels, is_consonant, nukta, virama, vowel_signs


def split(word: str, lang: str) -> list[str]:
    vir = virama(lang)
    out: list[str] = []
    for ch in word:
        if out and unicodedata.category(ch).startswith("M"):
            out[-1] += ch
        elif out and out[-1].endswith(vir) and is_consonant(ch, lang) and _joins(out[-1], ch, lang):
            out[-1] += ch
        else:
            out.append(ch)
    return out


def _joins(prev: str, ch: str, lang: str) -> bool:
    if lang != "ta-IN":
        return True
    return prev == "க்" and ch == "ஷ"


@dataclass(frozen=True)
class Akshara:
    text: str
    consonants: tuple[str, ...]  # each with its nukta, if any
    vowel: str  # independent vowel letter, or ""
    sign: str  # vowel sign, or "" (inherent a, or none when dead)
    dead: bool  # ends in a virama / pulli: no vowel
    marks: str  # anusvara, visarga, candrabindu, in order

    def rebuild(self, lang: str) -> str:
        """The written form again; parse(x).rebuild() == x for every akshara split() returns."""
        if self.vowel:
            return self.vowel + self.marks
        body = virama(lang).join(self.consonants)
        return body + (virama(lang) if self.dead else self.sign) + self.marks


def parse(text: str, lang: str) -> Akshara:
    vir, nuk = virama(lang), nukta(lang)
    cons: list[str] = []
    vowel = sign = marks = ""
    dead = False
    for ch in text:
        if is_consonant(ch, lang):
            cons.append(ch)
            dead = False
        elif nuk and ch == nuk and cons:
            cons[-1] += ch
        elif ch == vir:
            dead = True
        elif ch in vowel_signs(lang) and not sign:
            sign = ch  # a second sign (a typo in the source text) is kept as a mark
        elif ch in independent_vowels(lang):
            vowel = ch
        else:
            marks += ch
    return Akshara(text, tuple(cons), vowel, sign, dead, marks)


def _distance(a: list[str], b: list[str]) -> int:
    """Edit distance counted in aksharas."""
    prev = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        cur = [i]
        for j, y in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x != y)))
        prev = cur
    return prev[-1]


def near_miss(target: str, heard: str, lang: str) -> bool:
    """Whether `heard` is close enough to `target` that the speech service may have misheard it.

    Measured live (docs/WORKLOG.md, 2026-11-03): Timbre saying a short Tamil word correctly was
    heard as a near word in two of three tries (நாளை as நாலு, குடை as குடல்), so a single word
    heard this way is not proof of a mistake. Near means: the same first akshara, and at most one
    akshara different (two for a word of one or two aksharas, where one sound is most of it).
    """
    a, b = split(target.strip(), lang), split(heard.strip(), lang)
    if not a or not b or a == b or a[0] != b[0]:
        return False
    return _distance(a, b) <= (2 if len(a) <= 2 else 1)
