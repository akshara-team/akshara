"""Passage difficulty from the text alone, before any child has read it.

Six features per passage:
- `aksharas_per_word`: longer words are harder to hold together
- `conjunct_share`: share of aksharas that are conjuncts
- `sign_share`: share of aksharas with a vowel sign, virama/pulli or mark
- `rarity`: mean -log frequency of the passage's words in the rest of the bank (the passage itself
  is left out, so a word is not "common" just because this passage repeats it)
- `words_per_sentence`
- `aksharas`: total length

The score is the mean of the features' z-scores within the language's bank, so 0 is an average
passage and +1 is about one standard deviation harder on the typical feature. The weights are
equal on purpose: there is nothing to fit them on until real attempts exist (then item response
theory replaces this, docs/PRODUCT_PLAN.md section 6).

Pure and deterministic.
"""

import math
import re
from collections import Counter
from dataclasses import dataclass

from akshara.core.aksharas import parse, split
from akshara.core.text import words

FEATURES = (
    "aksharas_per_word",
    "conjunct_share",
    "sign_share",
    "rarity",
    "words_per_sentence",
    "aksharas",
)
_SENTENCE_END = re.compile(r"[।॥.!?]+")


@dataclass(frozen=True)
class Profile:
    features: dict[str, float]
    score: float


def _counts(text: str, lang: str) -> tuple[list[str], int, int, int, int]:
    ws = words(text)
    n_ak = n_conj = n_sign = 0
    for w in ws:
        for part in split(w, lang):
            a = parse(part, lang)
            n_ak += 1
            n_conj += len(a.consonants) > 1
            n_sign += bool(a.sign or a.dead or a.marks)
    sentences = [s for s in _SENTENCE_END.split(text) if words(s)]
    return ws, n_ak, n_conj, n_sign, max(len(sentences), 1)


def raw_features(texts: list[str], lang: str) -> list[dict[str, float]]:
    """Features for each passage of one language's bank, in order."""
    parsed = [_counts(t, lang) for t in texts]
    freq: Counter[str] = Counter()
    for ws, *_ in parsed:
        freq.update(ws)
    total = sum(freq.values())
    out = []
    for ws, n_ak, n_conj, n_sign, n_sent in parsed:
        own = Counter(ws)
        rest = total - len(ws)
        vocab = len(freq) + 1
        # add-one smoothing over the bank without this passage
        rarity = [-math.log((freq[w] - own[w] + 1) / (rest + vocab)) for w in ws]
        n_words = max(len(ws), 1)
        out.append(
            {
                "aksharas_per_word": n_ak / n_words,
                "conjunct_share": n_conj / max(n_ak, 1),
                "sign_share": n_sign / max(n_ak, 1),
                "rarity": sum(rarity) / n_words,
                "words_per_sentence": len(ws) / n_sent,
                "aksharas": float(n_ak),
            }
        )
    return out


def profiles(texts: list[str], lang: str) -> list[Profile]:
    feats = raw_features(texts, lang)
    stats = {}
    for f in FEATURES:
        xs = [d[f] for d in feats]
        mean = sum(xs) / len(xs)
        sd = math.sqrt(sum((x - mean) ** 2 for x in xs) / len(xs)) or 1.0
        stats[f] = (mean, sd)
    return [
        Profile(d, sum((d[f] - stats[f][0]) / stats[f][1] for f in FEATURES) / len(FEATURES))
        for d in feats
    ]
