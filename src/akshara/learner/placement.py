"""Placement: find a child's reading level with a short adaptive test, the ASER way.

Levels, lowest first: beginner, letter, word, paragraph, story (ASER's reading tool). The child
starts on a paragraph:
- paragraph passed: try a story. Passed: `story`. Failed: `paragraph`.
- paragraph failed: try words. Passed: `word`. Failed: try letters. Passed: `letter`.
  Failed: `beginner`.

Pass rules: letters and words, at least 4 of 5 right. Paragraph and story, at least 85% of words
right (ASER allows about 3 mistakes in a short paragraph).

The scorer can say `unsure` about a word. If the pass/fail call depends on those words (counting
them right passes, counting them wrong fails), the child gets one more item of the same task,
and the results are pooled. If it is still open after that, `unsure` counts as half right and the
placement is marked `uncertain`, so a teacher can listen.

This module only decides. Which letters, words and passages to show is up to the caller
(the app, or `learner/simulate.py`). Pure and deterministic.
"""

from dataclasses import dataclass, field

LEVELS = ("beginner", "letter", "word", "paragraph", "story")
TASKS = ("letters", "words", "paragraph", "story")
ITEM_PASS = {"letters": 0.8, "words": 0.8, "paragraph": 0.85, "story": 0.85}
MAX_ITEMS = 2  # per task: the first one, plus one more if `unsure` leaves the call open


def passes(states: list[str], task: str, unsure_as: float) -> bool:
    if not states:
        return False
    right = states.count("correct") + unsure_as * states.count("unsure")
    return right / len(states) >= ITEM_PASS[task] - 1e-9


@dataclass
class Placement:
    task: str | None = "paragraph"
    level: str | None = None
    uncertain: bool = False
    items: int = 0
    log: list[tuple[str, list[str], str]] = field(default_factory=list)  # task, states, outcome
    _pool: list[str] = field(default_factory=list)
    _given: int = 0

    @property
    def done(self) -> bool:
        return self.level is not None

    def record(self, states: list[str]) -> None:
        """Results of one item of the current task: a state per letter or word."""
        if self.task is None:
            raise ValueError("placement is finished")
        self.items += 1
        self._given += 1
        self._pool += states
        low = passes(self._pool, self.task, 0.0)
        high = passes(self._pool, self.task, 1.0)
        if low == high:
            self._decide(low, "pass" if low else "fail")
        elif self._given < MAX_ITEMS:
            self.log.append((self.task, list(states), "open"))
        else:
            self.uncertain = True
            ok = passes(self._pool, self.task, 0.5)
            self._decide(ok, "pass (half)" if ok else "fail (half)")

    def _decide(self, ok: bool, outcome: str) -> None:
        task = self.task
        assert task is not None
        self.log.append((task, list(self._pool), outcome))
        self._pool, self._given = [], 0
        nxt = {
            ("paragraph", True): ("story", None),
            ("paragraph", False): ("words", None),
            ("story", True): (None, "story"),
            ("story", False): (None, "paragraph"),
            ("words", True): (None, "word"),
            ("words", False): ("letters", None),
            ("letters", True): (None, "letter"),
            ("letters", False): (None, "beginner"),
        }[(task, ok)]
        self.task, self.level = nxt
