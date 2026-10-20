"""Plant reading mistakes into a passage, deterministically, for the reliability study.

Error types:
    skip     the word is not read
    near     one akshara changed to a close sound (aspiration, voicing, vowel length, ...)
    distant  replaced by an unrelated word from the same language
    half     only the first part of the word is read

The result is the text a reader would say (`read_as`) and where each error is, so a transcript can
be scored against the truth. Mutated words may not be real words; children produce those too.
"""

import random
import unicodedata

from akshara.core.text import loose_key, words

TYPES = ("skip", "near", "distant", "half")

# Devanagari pairs of close sounds; Kannada follows the same layout, 0x380 higher.
_DEV_PAIRS = "कख गघ चछ जझ टठ डढ तथ दध पफ बभ कग तद पब सश तट"
_DEV_VOWELS = "िी ुू"
_KN_OFFSET = 0x380
_TA_PAIRS = "லள ளழ னண நன ரற"
_TA_VOWELS = "ிீ ுூ"


def _table(lang: str) -> dict[str, list[str]]:
    if lang == "ta-IN":
        pairs, vowels = _TA_PAIRS.split(), _TA_VOWELS.split()
    else:
        shift = _KN_OFFSET if lang == "kn-IN" else 0
        pairs = ["".join(chr(ord(c) + shift) for c in p) for p in _DEV_PAIRS.split()]
        vowels = ["".join(chr(ord(c) + shift) for c in p) for p in _DEV_VOWELS.split()]
    table: dict[str, list[str]] = {}
    for a, b in [*pairs, *vowels]:
        table.setdefault(a, []).append(b)
        table.setdefault(b, []).append(a)
    return table


def near_candidates(word: str, lang: str) -> list[str]:
    """All words one close-sound change away that differ even under the loose spelling rules."""
    table = _table(lang)
    out = []
    for i, ch in enumerate(word):
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
            ("\u094d", "\u0ccd", "\u0bcd")
        ):
            return word[:cut]
    return None


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
    changes: dict[int, tuple[str, str | None]] = {}
    for kind in kinds:
        options = []
        for i in unique:
            if any(abs(i - j) < 2 for j in used):
                continue
            w = ref[i]
            if kind == "skip":
                options.append((i, None))
            elif kind == "near":
                options += [(i, c) for c in near_candidates(w, lang)]
            elif kind == "distant":
                same = [p for p in pool if p not in ref and abs(len(p) - len(w)) <= 2]
                options += [(i, p) for p in same[:50]]
            elif kind == "half" and (h := half_word(w)):
                options.append((i, h))
        if not options:
            return None
        i, said = rng.choice(options)
        used.add(i)
        changes[i] = (kind, said)
    read_as = [changes[i][1] if i in changes else w for i, w in enumerate(ref)]
    errors = [
        {"index": i, "type": k, **({"said": s} if s else {})}
        for i, (k, s) in sorted(changes.items())
    ]
    return {
        "id": pid,
        "lang": lang,
        "reference": reference,
        "read_as": " ".join(w for w in read_as if w),
        "errors": errors,
    }
