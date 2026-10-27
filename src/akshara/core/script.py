"""Letter and sound tables for Hindi (Devanagari), Kannada and Tamil.

Pure data and lookups. They feed mistake planting now and the per-word sound check later.

Every letter is looked up by its Unicode name ("KANNADA LETTER KHA"), so the three scripts share
one feature table and no code point is typed by hand. Consonant features follow the traditional
grid: place of articulation down, and voicing, aspiration and nasality across.

The tables are reviewed by native speakers before they are trusted
(docs/review/SCRIPT_TABLES.md).
"""

import json
import unicodedata
from dataclasses import dataclass
from functools import cache
from pathlib import Path

LANGS = ("hi-IN", "kn-IN", "ta-IN")
_PREFIX = {"hi-IN": "DEVANAGARI", "kn-IN": "KANNADA", "ta-IN": "TAMIL"}


@dataclass(frozen=True)
class Consonant:
    char: str
    place: str  # velar, palatal, retroflex, dental, alveolar, labial, glottal
    manner: str  # stop, nasal, approximant, rhotic, lateral, sibilant, fricative
    voiced: bool
    aspirated: bool


@dataclass(frozen=True)
class Vowel:
    char: str  # "" is the inherent vowel of a bare consonant
    quality: str  # a, i, u, r, e, ai, o, au
    long: bool


# name: (place, manner, voiced, aspirated)
_FEATURES = {
    "KA": ("velar", "stop", False, False),
    "KHA": ("velar", "stop", False, True),
    "GA": ("velar", "stop", True, False),
    "GHA": ("velar", "stop", True, True),
    "NGA": ("velar", "nasal", True, False),
    "CA": ("palatal", "stop", False, False),
    "CHA": ("palatal", "stop", False, True),
    "JA": ("palatal", "stop", True, False),
    "JHA": ("palatal", "stop", True, True),
    "NYA": ("palatal", "nasal", True, False),
    "TTA": ("retroflex", "stop", False, False),
    "TTHA": ("retroflex", "stop", False, True),
    "DDA": ("retroflex", "stop", True, False),
    "DDHA": ("retroflex", "stop", True, True),
    "NNA": ("retroflex", "nasal", True, False),
    "TA": ("dental", "stop", False, False),
    "THA": ("dental", "stop", False, True),
    "DA": ("dental", "stop", True, False),
    "DHA": ("dental", "stop", True, True),
    "NA": ("dental", "nasal", True, False),
    "PA": ("labial", "stop", False, False),
    "PHA": ("labial", "stop", False, True),
    "BA": ("labial", "stop", True, False),
    "BHA": ("labial", "stop", True, True),
    "MA": ("labial", "nasal", True, False),
    "YA": ("palatal", "approximant", True, False),
    "RA": ("alveolar", "rhotic", True, False),
    "LA": ("alveolar", "lateral", True, False),
    "VA": ("labial", "approximant", True, False),
    "SHA": ("palatal", "sibilant", False, False),
    "SSA": ("retroflex", "sibilant", False, False),
    "SA": ("dental", "sibilant", False, False),
    "HA": ("glottal", "fricative", True, False),
    "LLA": ("retroflex", "lateral", True, False),  # Kannada ಳ, Tamil ள
    "LLLA": ("retroflex", "approximant", True, False),  # Tamil ழ
    "RRA": ("alveolar", "rhotic", True, False),  # Tamil ற
    "NNNA": ("alveolar", "nasal", True, False),  # Tamil ன
}

_VARGA = (
    "KA KHA GA GHA NGA CA CHA JA JHA NYA TTA TTHA DDA DDHA NNA "
    "TA THA DA DHA NA PA PHA BA BHA MA YA RA LA VA SHA SSA SA HA"
).split()
_CONSONANT_NAMES = {
    "hi-IN": _VARGA,
    "kn-IN": [*_VARGA, "LLA"],
    # Tamil writes no voicing or aspiration; JA SSA SA HA are the Grantha letters for loanwords.
    "ta-IN": (
        "KA NGA CA NYA TTA NNA TA NA PA MA YA RA LA VA LLLA LLA RRA NNNA JA SSA SA HA"
    ).split(),
}

# name: (quality, long). Devanagari E and O are long; Kannada and Tamil have short E/O, long EE/OO.
_VOWELS = {
    "hi-IN": {
        "AA": ("a", True),
        "I": ("i", False),
        "II": ("i", True),
        "U": ("u", False),
        "UU": ("u", True),
        "VOCALIC R": ("r", False),
        "E": ("e", True),
        "AI": ("ai", True),
        "O": ("o", True),
        "AU": ("au", True),
    },
    "kn-IN": {
        "AA": ("a", True),
        "I": ("i", False),
        "II": ("i", True),
        "U": ("u", False),
        "UU": ("u", True),
        "VOCALIC R": ("r", False),
        "E": ("e", False),
        "EE": ("e", True),
        "AI": ("ai", True),
        "O": ("o", False),
        "OO": ("o", True),
        "AU": ("au", True),
    },
    "ta-IN": {
        "AA": ("a", True),
        "I": ("i", False),
        "II": ("i", True),
        "U": ("u", False),
        "UU": ("u", True),
        "E": ("e", False),
        "EE": ("e", True),
        "AI": ("ai", True),
        "O": ("o", False),
        "OO": ("o", True),
        "AU": ("au", True),
    },
}

# Places close enough that a child (or a transcriber) can swap them.
_CLOSE_PLACES = ({"retroflex", "dental"}, {"retroflex", "alveolar"}, {"dental", "alveolar"})


def _char(lang: str, kind: str, name: str) -> str:
    return unicodedata.lookup(f"{_PREFIX[lang]} {kind} {name}")


@cache
def consonants(lang: str) -> dict[str, Consonant]:
    out = {}
    for name in _CONSONANT_NAMES[lang]:
        ch = _char(lang, "LETTER", name)
        out[ch] = Consonant(ch, *_FEATURES[name])
    return out


@cache
def vowel_signs(lang: str) -> dict[str, Vowel]:
    """Dependent vowel signs, plus "" for the inherent short a."""
    out = {"": Vowel("", "a", False)}
    for name, (quality, long) in _VOWELS[lang].items():
        ch = _char(lang, "VOWEL SIGN", name)
        out[ch] = Vowel(ch, quality, long)
    return out


@cache
def independent_vowels(lang: str) -> dict[str, Vowel]:
    out = {_char(lang, "LETTER", "A"): Vowel(_char(lang, "LETTER", "A"), "a", False)}
    for name, (quality, long) in _VOWELS[lang].items():
        ch = _char(lang, "LETTER", name)
        out[ch] = Vowel(ch, quality, long)
    return out


@cache
def virama(lang: str) -> str:
    return _char(lang, "SIGN", "VIRAMA")


@cache
def nukta(lang: str) -> str | None:
    return None if lang == "ta-IN" else _char(lang, "SIGN", "NUKTA")


def is_consonant(ch: str, lang: str) -> bool:
    """Any consonant letter of the script, including ones outside the feature table."""
    name = unicodedata.name(ch, "")
    return name.startswith(f"{_PREFIX[lang]} LETTER ") and ch not in independent_vowels(lang)


def length_partner(vowel: str, lang: str) -> str | None:
    """The same vowel with the other length (ि ↔ ी, "" ↔ ा), for signs or independent vowels."""
    for table in (vowel_signs(lang), independent_vowels(lang)):
        if vowel in table:
            v = table[vowel]
            for other in table.values():
                if other.quality == v.quality and other.long != v.long:
                    return other.char
    return None


def _liquid(c: Consonant) -> bool:
    return c.manner in ("lateral", "rhotic") or (
        c.manner == "approximant" and c.place == "retroflex"
    )


def sound_link(a: Consonant, b: Consonant) -> str | None:
    """How two consonants are close in sound, or None. One feature apart, by design."""
    same_place = a.place == b.place
    close_place = {a.place, b.place} in _CLOSE_PLACES
    if a.manner == b.manner == "stop":
        if same_place and a.aspirated == b.aspirated and a.voiced != b.voiced:
            return "voicing"
        if same_place and a.voiced == b.voiced and a.aspirated != b.aspirated:
            return "aspiration"
        if close_place and a.voiced == b.voiced and a.aspirated == b.aspirated:
            return "place"
    if a.manner == b.manner == "nasal" and close_place:
        return "nasal"
    if a.manner == b.manner == "sibilant":
        return "sibilant"
    if _liquid(a) and _liquid(b):
        return "liquid"
    return None


def sound_neighbours(ch: str, lang: str) -> list[tuple[str, str]]:
    """Consonants one sound feature away from `ch`, with how they differ."""
    table = consonants(lang)
    if ch not in table:
        return []
    return [
        (o.char, how) for o in table.values() if o.char != ch and (how := sound_link(table[ch], o))
    ]


_GLYPHS = Path(__file__).parent / "tables" / "glyph_similarity.json"


@cache
def _glyph_table() -> dict:
    if not _GLYPHS.exists():
        return {}
    return json.loads(_GLYPHS.read_text(encoding="utf-8"))


def visual_neighbours(ch: str, lang: str, min_similarity: float = 0.0) -> list[tuple[str, float]]:
    """Letters that look like `ch`, most similar first (built by scripts/build_glyph_table.py)."""
    rows = _glyph_table().get("letters", {}).get(lang, {}).get(ch, [])
    return [(o, s) for o, s in rows if s >= min_similarity]
