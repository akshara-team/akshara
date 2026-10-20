"""Align a reading transcript to the story text and score it."""

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Literal

from akshara.core.text import loose_key, words

Op = Literal["correct", "substituted", "skipped", "inserted"]


@dataclass(frozen=True)
class WordMark:
    op: Op
    ref_index: int | None  # position in the story; None for inserted words
    ref_word: str | None
    said: str | None


@dataclass
class Score:
    marks: list[WordMark]
    total_words: int
    correct: int
    duration_s: float | None = None
    flagged_indexes: list[int] = field(default_factory=list)

    @property
    def accuracy(self) -> float:
        return self.correct / self.total_words if self.total_words else 0.0

    @property
    def wcpm(self) -> float | None:
        """Words correct per minute, if the reading time is known."""
        if not self.duration_s:
            return None
        return self.correct / (self.duration_s / 60)


def align(
    reference: list[str], spoken: list[str], key: Callable[[str], str] = str
) -> list[WordMark]:
    """Word-level edit-distance alignment. Ties prefer a match, then a substitution.

    `key` maps a word to the form that is compared, so spelling variants can count as equal.
    """
    n, m = len(reference), len(spoken)
    ref_k, spk_k = [key(w) for w in reference], [key(w) for w in spoken]
    # dp[i][j] = cost of aligning reference[:i] with spoken[:j]
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            same = ref_k[i - 1] == spk_k[j - 1]
            dp[i][j] = min(
                dp[i - 1][j - 1] + (0 if same else 1),
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
            )

    marks: list[WordMark] = []
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0:
            same = ref_k[i - 1] == spk_k[j - 1]
            if dp[i][j] == dp[i - 1][j - 1] + (0 if same else 1):
                op: Op = "correct" if same else "substituted"
                marks.append(WordMark(op, i - 1, reference[i - 1], spoken[j - 1]))
                i, j = i - 1, j - 1
                continue
        if i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            marks.append(WordMark("skipped", i - 1, reference[i - 1], None))
            i -= 1
        else:
            marks.append(WordMark("inserted", None, None, spoken[j - 1]))
            j -= 1
    marks.reverse()
    return marks


def score(
    reference_text: str,
    transcript: str,
    duration_s: float | None = None,
    *,
    loose: bool = False,
) -> Score:
    """Score a reading. `loose` treats harmless spelling variants as the same word."""
    ref = words(reference_text)
    marks = align(ref, words(transcript), loose_key if loose else str)
    correct = sum(1 for mk in marks if mk.op == "correct")
    flagged = [mk.ref_index for mk in marks if mk.op in ("substituted", "skipped")]
    return Score(
        marks=marks,
        total_words=len(ref),
        correct=correct,
        duration_s=duration_s,
        flagged_indexes=flagged,  # type: ignore[arg-type]
    )
