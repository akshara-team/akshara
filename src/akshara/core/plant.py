"""Plant reading mistakes into a passage, deterministically, for the reliability study.

Error types:
    skip     the word is not read
    near     one consonant changed to a clearly different close sound (aspiration, voicing, place)
    distant  replaced by an unrelated word from the same language
    half     only the first part of the word is read
    repeat, selfcorrect   fluency events (see DISFLUENCY): the word twice, or a slip then the word

Second set (TYPES_V2, DISFLUENCY_V2), built on the script tables (core/script.py):
    vowel_length  one vowel's length swapped (ि/ी, ಉ/ಊ, inherent a/ா), not in the last akshara
    matra         one vowel sign dropped or swapped for a different vowel
    visual        one consonant swapped for a letter that looks like it
    conjunct      a conjunct read apart (स्कूल -> सकूल), or a Tamil pulli consonant read with a vowel
    reversal      two neighbouring aksharas swapped
    first_guess   the first akshara is right, the rest is another word that starts the same way
    decode, hesitation   fluency: sounded out akshara by akshara then said, or a long pause first

TAXONOMY says, per type, whether a detector should flag it and whether "not sure" is acceptable.

The result is the text a reader would say (`read_as`) and where each error is, so a transcript can
be scored against the truth. Mutated words may not be real words; children produce those too.
The first set's output is unchanged by the second, so earlier study files rebuild identically.
"""

import random
import unicodedata
from dataclasses import dataclass, replace

from akshara.core import aksharas as ak
from akshara.core.script import (
    consonants,
    length_partner,
    sound_link,
    virama,
    visual_neighbours,
    vowel_signs,
)
from akshara.core.text import loose_key, words

TYPES = ("skip", "near", "distant", "half")
# Fluency events, not wrong words: the reader says more than the text, so a verbatim transcript
# should keep the extra word. They are scored as "kept" or "lost", not as flagged mistakes.
DISFLUENCY = ("repeat", "selfcorrect")
TYPES_V2 = (*TYPES, "vowel_length", "matra", "visual", "conjunct", "reversal", "first_guess")
DISFLUENCY_V2 = (*DISFLUENCY, "decode", "hesitation")
HESITATION_S = (1.0, 1.5, 2.0, 3.0)


@dataclass(frozen=True)
class Kind:
    family: str  # "word": a wrong or missing word; "fluency": extra speech, the word still read
    should_flag: bool  # a good detector marks this word wrong
    abstain_ok: bool  # "not sure" is acceptable: the word goes to a person, not marked correct
    audible: str  # "yes", or "check": a synthetic voice may not make the change audible
    about: str


TAXONOMY = {
    "skip": Kind("word", True, False, "yes", "word not read"),
    "distant": Kind("word", True, False, "yes", "an unrelated word instead"),
    "half": Kind("word", True, False, "yes", "only the first part read"),
    "first_guess": Kind("word", True, False, "yes", "first akshara right, then another word"),
    "reversal": Kind("word", True, False, "yes", "two neighbouring aksharas swapped"),
    "near": Kind("word", True, True, "yes", "one consonant changed to a close sound"),
    "visual": Kind("word", True, True, "yes", "one consonant read as a look-alike letter"),
    "matra": Kind("word", True, True, "yes", "a vowel sign dropped or read as another vowel"),
    "conjunct": Kind("word", True, True, "yes", "a conjunct read apart"),
    "vowel_length": Kind("word", True, True, "check", "a vowel read short for long or back"),
    "repeat": Kind("fluency", False, False, "yes", "the word said twice"),
    "selfcorrect": Kind("fluency", False, False, "yes", "a slip, then the right word"),
    "decode": Kind("fluency", False, False, "yes", "sounded out akshara by akshara, then said"),
    "hesitation": Kind("fluency", False, False, "yes", "a long pause before the word"),
}

# Close-sound pairs that are clearly audible: aspiration, voicing and place of a consonant.
# Devanagari first; Kannada follows the same layout, 0x380 higher. Vowel length, sibilants and
# word-final changes are left out: a first run showed they are often not audible in synthetic
# speech, so a "miss" on them says nothing about the transcriber (docs/RESULTS.md).
_DEV_PAIRS = "कख गघ चछ जझ टठ डढ तथ दध पफ बभ कग तद पब तट"
_KN_OFFSET = 0x380
_TA_PAIRS = "ரற ளழ டத பக தப"


def _table(lang: str) -> dict[str, list[str]]:
    if lang == "ta-IN":
        pairs = _TA_PAIRS.split()
    else:
        shift = _KN_OFFSET if lang == "kn-IN" else 0
        pairs = ["".join(chr(ord(c) + shift) for c in p) for p in _DEV_PAIRS.split()]
    table: dict[str, list[str]] = {}
    for a, b in pairs:
        table.setdefault(a, []).append(b)
        table.setdefault(b, []).append(a)
    return table


def near_candidates(word: str, lang: str) -> list[str]:
    """All words one close-sound change away that differ even under the loose spelling rules."""
    table = _table(lang)
    out = []
    for i, ch in enumerate(
        word[:-1]
    ):  # not the last letter: word-final changes are often inaudible
        for rep in table.get(ch, []):
            new = word[:i] + rep + word[i + 1 :]
            if loose_key(new) != loose_key(word):
                out.append(new)
    return out


def half_word(word: str) -> str | None:
    """The first part of a word, cut so no combining mark or virama is left dangling."""
    mid = len(word) // 2 + 1
    for cut in [*range(mid, len(word)), *range(mid - 1, 1, -1)]:
        if unicodedata.category(word[cut]).startswith("L") and not word[:cut].endswith(
            ("्", "್", "்")
        ):
            return word[:cut]
    return None


# Second-set candidates. Each returns (spoken form, detail) pairs; detail says what changed.


def _differs(new: str, word: str) -> bool:
    return new != word and loose_key(new) != loose_key(word)


def _with(parts: list[str], i: int, new: str) -> str:
    return "".join(parts[:i] + [new] + parts[i + 1 :])


def vowel_length_candidates(word: str, lang: str) -> list[tuple[str, str]]:
    """One vowel's length swapped, never in the last akshara (final length is often not heard)."""
    parts, out = ak.split(word, lang), []
    for i, text in enumerate(parts[:-1]):
        a = ak.parse(text, lang)
        if a.vowel:
            old, partner = a.vowel, length_partner(a.vowel, lang)
            new = partner + a.marks if partner else None
        elif a.consonants and not a.dead:
            old, partner = a.sign, length_partner(a.sign, lang)
            new = None if partner is None else replace(a, sign=partner).rebuild(lang)
        else:
            continue
        if new and _differs(cand := _with(parts, i, new), word):
            out.append((cand, f"{old or 'a'}->{partner or 'a'}"))
    return out


def matra_candidates(word: str, lang: str) -> list[tuple[str, str]]:
    """One vowel sign dropped (to the inherent a) or swapped for a vowel of another quality."""
    parts, out = ak.split(word, lang), []
    signs = vowel_signs(lang)
    for i, text in enumerate(parts):
        a = ak.parse(text, lang)
        if not a.consonants or a.dead:
            continue
        here = signs[a.sign]
        for sign, v in signs.items():
            if v.quality == here.quality:
                continue  # the same vowel at the other length is vowel_length
            if v.quality in ("r", "ai", "au"):
                continue  # rare vowels make implausible readings
            if _differs(cand := _with(parts, i, replace(a, sign=sign).rebuild(lang)), word):
                out.append((cand, f"{a.sign or 'a'}->{sign or 'a'}"))
    return out


def visual_candidates(word: str, lang: str, top: int = 2) -> list[tuple[str, str]]:
    """One consonant swapped for one of its `top` closest look-alike consonants."""
    table = consonants(lang)
    out = []
    for i, ch in enumerate(word):
        if ch not in table:
            continue
        for o in [o for o, _ in visual_neighbours(ch, lang) if o in table][:top]:
            cand = word[:i] + o + word[i + 1 :]
            if _differs(cand, word):
                also = " (also a close sound)" if sound_link(table[ch], table[o]) else ""
                out.append((cand, f"{ch}->{o}{also}"))
    return out


def conjunct_candidates(word: str, lang: str) -> list[tuple[str, str]]:
    """A conjunct read apart: its first virama dropped, so the first consonant gets a vowel.

    In Tamil a pulli consonant is a letter of its own, so the change is reading it with a vowel.
    Never in the last akshara.
    """
    parts, out = ak.split(word, lang), []
    for i, text in enumerate(parts[:-1]):
        a = ak.parse(text, lang)
        if len(a.consonants) >= 2 or (lang == "ta-IN" and a.dead):
            new = text.replace(virama(lang), "", 1)
            if _differs(cand := _with(parts, i, new), word):
                out.append((cand, f"{text}->{new}"))
    return out


def reversal_candidates(word: str, lang: str) -> list[tuple[str, str]]:
    """Two neighbouring aksharas swapped."""
    parts, out = ak.split(word, lang), []
    for i in range(len(parts) - 1):
        a, b = parts[i], parts[i + 1]
        cand = "".join(parts[:i] + [b, a] + parts[i + 2 :])
        if a != b and _differs(cand, word):
            out.append((cand, f"{a}{b}->{b}{a}"))
    return out


def first_guess_candidates(word: str, lang: str, pool: list[str]) -> list[tuple[str, str]]:
    """Another pool word with the same first akshara and about the same length."""
    parts = ak.split(word, lang)
    if len(parts) < 2:
        return []
    out = []
    for p in pool:
        pp = ak.split(p, lang)
        if pp[0] == parts[0] and abs(len(pp) - len(parts)) <= 1 and _differs(p, word):
            out.append((p, f"{parts[0]}... -> {p}"))
    return out


_GENERATORS = {
    "vowel_length": vowel_length_candidates,
    "matra": matra_candidates,
    "visual": visual_candidates,
    "conjunct": conjunct_candidates,
    "reversal": reversal_candidates,
}


def plant(
    pid: str,
    lang: str,
    reference: str,
    kinds: list[str],
    pool: list[str],
    seed: int = 0,
) -> dict | None:
    """Return a passage dict with `read_as` and `errors`, or None if the kinds cannot be placed."""
    rng = random.Random(f"{seed}:{pid}")
    ref = words(reference)
    unique = [i for i, w in enumerate(ref) if ref.count(w) == 1 and len(w) >= 3]
    used: set[int] = set()
    changes: dict[int, tuple[str, str | None, dict]] = {}
    for kind in kinds:
        options: list[tuple[int, str | None, str | None]] = []
        for i in unique:
            if any(abs(i - j) < 2 for j in used):
                continue
            w = ref[i]
            if kind == "skip":
                options.append((i, None, None))
            elif kind == "near":
                options += [(i, c, None) for c in near_candidates(w, lang)]
            elif kind == "distant":
                same = [p for p in pool if p not in ref and abs(len(p) - len(w)) <= 2]
                options += [(i, p, None) for p in same[:50]]
            elif kind == "half" and (h := half_word(w)):
                options.append((i, h, None))
            elif kind == "repeat":
                options.append((i, f"{w} {w}", None))
            elif kind == "selfcorrect":
                options += [(i, f"{c} {w}", None) for c in near_candidates(w, lang)]
            elif kind in _GENERATORS:
                options += [(i, c, d) for c, d in _GENERATORS[kind](w, lang)]
            elif kind == "first_guess":
                outside = [p for p in pool if p not in ref]
                options += [(i, c, d) for c, d in first_guess_candidates(w, lang, outside)]
            elif kind == "decode" and len(parts := ak.split(w, lang)) >= 2:
                options.append((i, f"{' '.join(parts)} {w}", " ".join(parts)))
            elif kind == "hesitation":
                options.append((i, w, None))
        if not options:
            return None
        i, said, detail = rng.choice(options)
        extra: dict = {"detail": detail} if detail else {}
        if kind == "hesitation":
            extra["pause_s"] = rng.choice(HESITATION_S)
        used.add(i)
        changes[i] = (kind, said, extra)
    read_as = [changes[i][1] if i in changes else w for i, w in enumerate(ref)]
    # a skip is the only change that leaves the word unsaid: its `said` is None
    errors = [
        {"index": i, "type": k, **({"said": s} if s else {}), **x}
        for i, (k, s, x) in sorted(changes.items())
    ]
    return {
        "id": pid,
        "lang": lang,
        "reference": reference,
        "read_as": " ".join(w for w in read_as if w),
        "errors": errors,
    }
