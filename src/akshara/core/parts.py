"""Split a passage into parts a child reads one at a time. Pure: no I/O, no model calls.

A part is one or more whole sentences, packed up to `target` words. A sentence is only cut
when it alone runs past `hard_max` words, and then into near-equal pieces. At a child's 35-54
words a minute, 12 words is about 15-20 s, well inside Prisma's 30 s limit.
"""

import math

# Sentence-final marks: Latin, danda and double danda. Closing quotes/brackets may follow.
_ENDS = (".", "?", "!", "।", "॥")
_TRAILING = "\"'”’)]»"

TARGET_WORDS = 12
HARD_MAX_WORDS = 20
MIN_WORDS = 4


def _sentences(text: str) -> list[list[str]]:
    out: list[list[str]] = []
    current: list[str] = []
    for token in text.split():
        current.append(token)
        if token.rstrip(_TRAILING).endswith(_ENDS):
            out.append(current)
            current = []
    if current:
        out.append(current)
    return out


def _cut(sentence: list[str], target: int) -> list[list[str]]:
    pieces = math.ceil(len(sentence) / target)
    size = math.ceil(len(sentence) / pieces)
    return [sentence[i : i + size] for i in range(0, len(sentence), size)]


def split_parts(text: str, target: int = TARGET_WORDS, hard_max: int = HARD_MAX_WORDS) -> list[str]:
    """Parts in reading order. Joining them with spaces gives back the passage's words."""
    if target < 1 or hard_max < target:
        raise ValueError("need 1 <= target <= hard_max")
    chunks: list[list[str]] = []
    for sentence in _sentences(text):
        chunks.extend(_cut(sentence, target) if len(sentence) > hard_max else [sentence])
    parts: list[list[str]] = []
    for chunk in chunks:
        if parts and len(parts[-1]) + len(chunk) <= target:
            parts[-1].extend(chunk)
        else:
            parts.append(list(chunk))
    return [" ".join(p) for p in _absorb_short(parts, hard_max)]


def _absorb_short(parts: list[list[str]], hard_max: int) -> list[list[str]]:
    """A part under MIN_WORDS ("Why?") joins its neighbour if the result stays <= hard_max."""
    out: list[list[str]] = []
    for part in parts:
        if out and (len(part) < MIN_WORDS or len(out[-1]) < MIN_WORDS):
            if len(out[-1]) + len(part) <= hard_max:
                out[-1].extend(part)
                continue
        out.append(part)
    return out
