import json
import unicodedata
from pathlib import Path

import pytest

from akshara.core.aksharas import parse, split
from akshara.core.script import (
    LANGS,
    consonants,
    length_partner,
    sound_neighbours,
    visual_neighbours,
)
from akshara.core.text import words

DATA = Path(__file__).resolve().parent.parent / "data"


@pytest.mark.parametrize("lang", LANGS)
def test_every_letter_belongs_to_its_script(lang):
    prefix = {"hi-IN": "DEVANAGARI", "kn-IN": "KANNADA", "ta-IN": "TAMIL"}[lang]
    for ch in consonants(lang):
        assert unicodedata.name(ch).startswith(f"{prefix} LETTER ")


def test_kannada_follows_the_devanagari_grid():
    hi, kn = consonants("hi-IN"), consonants("kn-IN")
    for ch, c in hi.items():
        k = kn[chr(ord(ch) + 0x380)]
        assert (k.place, k.manner, k.voiced, k.aspirated) == (
            c.place,
            c.manner,
            c.voiced,
            c.aspirated,
        )


def test_hindi_has_no_kannada_only_letters():
    assert "ळ" not in consonants("hi-IN") and "ಳ" in consonants("kn-IN")


@pytest.mark.parametrize(
    "lang,a,b,how",
    [
        ("hi-IN", "क", "ख", "aspiration"),
        ("hi-IN", "क", "ग", "voicing"),
        ("hi-IN", "ट", "त", "place"),
        ("hi-IN", "न", "ण", "nasal"),
        ("hi-IN", "श", "स", "sibilant"),
        ("kn-IN", "ಲ", "ಳ", "liquid"),
        ("ta-IN", "ல", "ழ", "liquid"),
        ("ta-IN", "ர", "ற", "liquid"),
        ("ta-IN", "ந", "ன", "nasal"),
    ],
)
def test_known_close_sounds(lang, a, b, how):
    assert (b, how) in sound_neighbours(a, lang)
    assert (a, how) in sound_neighbours(b, lang)  # symmetric


def test_unrelated_sounds_are_not_neighbours():
    assert not [o for o, _ in sound_neighbours("क", "hi-IN") if o in "मपस"]


@pytest.mark.parametrize(
    "lang,a,b",
    [("hi-IN", "ि", "ी"), ("hi-IN", "", "ा"), ("kn-IN", "ೆ", "ೇ"), ("ta-IN", "ொ", "ோ")],
)
def test_vowel_length_partners(lang, a, b):
    assert length_partner(a, lang) == b and length_partner(b, lang) == a


def test_hindi_e_has_no_short_partner():
    assert length_partner("े", "hi-IN") is None


def test_glyph_table_is_built_and_finds_a_known_look_alike():
    assert "ब" in [o for o, _ in visual_neighbours("व", "hi-IN")[:2]]
    assert all(s <= 1.0 for _, s in visual_neighbours("ಪ", "kn-IN"))


@pytest.mark.parametrize(
    "word,lang,parts",
    [
        ("स्कूल", "hi-IN", ["स्कू", "ल"]),
        ("क्या", "hi-IN", ["क्या"]),
        ("मिर्ची", "hi-IN", ["मि", "र्ची"]),
        ("बड़ा", "hi-IN", ["ब", "ड़ा"]),
        ("ಪುಸ್ತಕ", "kn-IN", ["ಪು", "ಸ್ತ", "ಕ"]),
        ("ಕ್ಷಮೆ", "kn-IN", ["ಕ್ಷ", "ಮೆ"]),
        ("படம்", "ta-IN", ["ப", "ட", "ம்"]),
        ("கடைக்கு", "ta-IN", ["க", "டை", "க்", "கு"]),
        ("லக்ஷ்மி", "ta-IN", ["ல", "க்ஷ்", "மி"]),
    ],
)
def test_split(word, lang, parts):
    assert split(word, lang) == parts


def test_parse_reads_the_parts_of_an_akshara():
    a = parse("स्तों", "hi-IN")
    assert a.consonants == ("स", "त") and a.sign == "ो" and a.marks == "ं" and not a.dead
    assert parse("ம்", "ta-IN").dead


def test_split_and_rebuild_are_lossless_on_every_passage_word():
    for line in (DATA / "open_passages" / "candidates.jsonl").read_text("utf-8").splitlines():
        r = json.loads(line)
        for w in words(r["reference"]):
            rebuilt = "".join(parse(p, r["lang"]).rebuild(r["lang"]) for p in split(w, r["lang"]))
            assert rebuilt == w
