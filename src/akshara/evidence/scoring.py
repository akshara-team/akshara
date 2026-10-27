"""Turn per-word evidence into flags and rates, the same way for every evidence source.

Pure functions; `scripts/evidence_report.py` applies them to the benchmark.

Thresholds are set from correctly read words only: the strictest cut that keeps false flags at
or under a target rate. Planted mistakes never influence where the line goes.
"""

import math

from akshara.core.plant import TAXONOMY
from akshara.dataset import Clip


def threshold_at(ok_scores: list[float], max_rate: float) -> float:
    """Cut t such that flagging `score < t` flags at most `max_rate` of `ok_scores`.

    Of all such cuts, this is the highest (flags the most). With no scores, nothing is flagged.
    """
    if not ok_scores:
        return -math.inf
    s = sorted(ok_scores)
    k = math.floor(max_rate * len(s) + 1e-9)  # how many ok words may be flagged
    return s[k] if k < len(s) else math.inf


def labels(clip: Clip) -> tuple[dict[int, str], dict[int, str]]:
    """Story word index -> planted type, split into word mistakes and fluency events."""
    mistakes, fluency = {}, {}
    for e in clip.errors:
        if TAXONOMY[e["type"]].should_flag:
            mistakes[e["index"]] = e["type"]
        else:
            fluency[e["index"]] = e["type"]
    return mistakes, fluency


def edit_distance(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def heard_as_said(free_text: str, word: str, said: str) -> bool:
    """Is the model's free reading closer to what the voice was asked to say than to the word?"""
    return edit_distance(free_text, said) < edit_distance(free_text, word)
