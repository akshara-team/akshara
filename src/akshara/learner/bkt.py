"""Bayesian Knowledge Tracing: how likely the child is to know each skill.

Per skill, two hidden states (known, not known) and four numbers:
- `p_init`: chance the skill is known before any evidence
- `p_learn`: chance of learning it at each practice opportunity
- `p_slip`: chance of reading a word wrong although every skill in it is known
- `p_guess`: chance of reading a word right although this skill is not known

The defaults are textbook-sized guesses; a pilot refits them (docs/PRODUCT_PLAN.md section 15).

One word result is evidence about several skills at once. A correctly read word counts for every
skill in it. A misread word is blamed on its skills in proportion to how likely each is to be
unknown, so a word with one shaky skill and five solid ones mostly lowers the shaky one.

How much a result counts depends on where it came from:
- `error` / `correct` from the scorer: full weight
- `unsure`: weak evidence (`UNSURE_WEIGHT`), counted as half right, half wrong
- a teacher's override: strong evidence (`TEACHER_WEIGHT`)

A weight w raises the likelihood of the observation to the power w (tempered Bayes), so
w = 0 ignores it and w = 1 is a plain update.

Pure and deterministic.
"""

from dataclasses import dataclass, field

UNSURE_WEIGHT = 0.3
TEACHER_WEIGHT = 2.0


@dataclass(frozen=True)
class Params:
    p_init: float = 0.3
    p_learn: float = 0.05
    p_slip: float = 0.1
    p_guess: float = 0.2


def update(p: float, correct: bool, params: Params, weight: float = 1.0) -> float:
    """P(known) after one observation of one skill, then one chance to learn."""
    if weight > 0:
        if correct:
            like_known, like_not = 1 - params.p_slip, params.p_guess
        else:
            like_known, like_not = params.p_slip, 1 - params.p_guess
        a = p * like_known**weight
        b = (1 - p) * like_not**weight
        p = a / (a + b)
    return p + (1 - p) * params.p_learn


@dataclass
class Learner:
    """Mastery estimates for one child. Skills never seen sit at `p_init`."""

    params: Params = field(default_factory=Params)
    mastery: dict[str, float] = field(default_factory=dict)
    seen: dict[str, int] = field(default_factory=dict)

    def p(self, skill: str) -> float:
        return self.mastery.get(skill, self.params.p_init)

    def observe(self, skills: list[str], result: str, *, teacher: bool = False) -> None:
        """One word: `result` is "correct", "error" or "unsure"."""
        if not skills:
            return
        base = TEACHER_WEIGHT if teacher else 1.0
        if result == "unsure":
            # half right, half wrong, at a low weight each
            self._apply(skills, True, base * UNSURE_WEIGHT / 2, learn=False)
            self._apply(skills, False, base * UNSURE_WEIGHT / 2, learn=True)
        else:
            self._apply(skills, result == "correct", base, learn=True)

    def _apply(self, skills: list[str], correct: bool, weight: float, *, learn: bool) -> None:
        if correct:
            shares = {s: 1.0 for s in skills}
        else:
            doubt = {s: 1 - self.p(s) for s in skills}
            total = sum(doubt.values()) or 1.0
            # blame = half spread evenly, half by doubt; scaled so the most doubtful skill in a
            # word gets a full update and a solid skill only a small one (capped at 1)
            n = len(skills)
            shares = {s: min(1.0, d / total * n / 2 + 1 / (2 * n)) for s, d in doubt.items()}
        params = (
            self.params
            if learn
            else Params(self.params.p_init, 0.0, self.params.p_slip, self.params.p_guess)
        )
        for s in skills:
            self.mastery[s] = update(self.p(s), correct, params, weight * shares[s])
            if learn:
                self.seen[s] = self.seen.get(s, 0) + 1

    def known(self, threshold: float = 0.95) -> list[str]:
        """Skills considered mastered (the usual BKT cut is 0.95)."""
        return [s for s, p in self.mastery.items() if p >= threshold]
