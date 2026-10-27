"""Fusion: turn the evidence about one word into one of three states, and a passage into a band.

Inputs per word, from two independent sources:
- Prisma: what the transcript has at this story word (correct, substituted, skipped), with
  strict and loose spelling (`core/align.py`)
- the per-word acoustic check (`evidence/words.py`): margins against likely misreadings and
  against the model's free reading

Two deciders, both explainable word by word:
- `rule_state`: a fixed table on agreement. Both sources doubt the word: `error`. One does:
  `unsure`. Neither: `correct`.
- a small logistic model per language (`fit_logistic`, a few named features), mapped to a
  probability by isotonic calibration, then two thresholds: `error` above one, `correct` below
  the other, `unsure` between.

The guarded variant (`state(..., doubted=False)`) never marks `error` a word that neither source
doubts. It was added after the Phase 3 test run, so it is judged on the held-out engine.

Thresholds are set to hold false flags (a correctly read word marked `error`) at a target rate
first; catching mistakes comes second. Telling a child they failed a word they read well is the
expensive mistake.

Pure numpy and deterministic: no network, no model calls.
"""

from dataclasses import dataclass

import numpy as np

States = ("correct", "unsure", "error")

FEATURES = (
    "prisma",  # Prisma flags the word (loose spelling)
    "prisma_skip",  # Prisma has nothing for it
    "variant",  # Prisma wrote a spelling variant (strict flags, loose does not)
    "alt",  # margin against the best listed misreading, per frame (0 when none is listed)
    "has_alt",
    "free",  # margin against the model's free reading, per frame (0 for a spelling variant)
    "edits",  # letters the free reading changes, capped at 3
    "prisma_x_alt",  # agreement terms: a doubt both sources share counts extra
    "prisma_x_free",
    "letters",  # log of the word's length in letters
)


@dataclass(frozen=True)
class WordInput:
    prisma_op: str | None  # loose: "correct", "substituted", "skipped"; None if no transcript
    prisma_strict_flag: bool
    margin_alt: float | None
    margin_free: float  # already spelling-aware: 0 when the free reading is a spelling variant
    free_edits: int
    letters: int


def features(w: WordInput) -> np.ndarray:
    prisma = float(w.prisma_op in ("substituted", "skipped"))
    alt = 0.0 if w.margin_alt is None else float(np.clip(w.margin_alt, -3, 3))
    free = float(np.clip(w.margin_free, -3, 0))
    return np.array(
        [
            prisma,
            float(w.prisma_op == "skipped"),
            float(w.prisma_strict_flag and not prisma),
            alt,
            float(w.margin_alt is not None),
            free,
            float(min(w.free_edits, 3)),
            prisma * alt,
            prisma * free,
            float(np.log(max(w.letters, 1))),
        ]
    )


# --- logistic model --------------------------------------------------------------------------


@dataclass(frozen=True)
class Logistic:
    weights: np.ndarray  # one per feature
    bias: float
    mean: np.ndarray
    scale: np.ndarray

    def score(self, x: np.ndarray) -> np.ndarray:
        """Log-odds of `error`, for rows of features."""
        z = (np.atleast_2d(x) - self.mean) / self.scale
        return z @ self.weights + self.bias

    def explain(self, x: np.ndarray) -> dict[str, float]:
        """Each feature's push on the log-odds for one word: why the model decided."""
        z = (x - self.mean) / self.scale
        return {name: float(v) for name, v in zip(FEATURES, z * self.weights, strict=True)}


def fit_logistic(x: np.ndarray, y: np.ndarray, l2: float = 1.0, iters: int = 50) -> Logistic:
    """L2-regularised logistic regression by Newton steps. Deterministic; no randomness.

    Features are standardised first so one penalty suits all of them. The bias is not penalised.
    """
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    mean = x.mean(axis=0)
    scale = x.std(axis=0)
    scale[scale == 0] = 1.0
    z = np.hstack([(x - mean) / scale, np.ones((len(x), 1))])
    w = np.zeros(z.shape[1])
    pen = np.full(z.shape[1], l2)
    pen[-1] = 0.0
    for _ in range(iters):
        p = 1 / (1 + np.exp(-(z @ w)))
        grad = z.T @ (p - y) + pen * w
        hess = (z * (p * (1 - p))[:, None]).T @ z + np.diag(pen) + 1e-9 * np.eye(len(w))
        step = np.linalg.solve(hess, grad)
        w -= step
        if np.abs(step).max() < 1e-8:
            break
    return Logistic(w[:-1], float(w[-1]), mean, scale)


# --- calibration -----------------------------------------------------------------------------


@dataclass(frozen=True)
class Isotonic:
    """A non-decreasing step map from score to probability (pool-adjacent-violators)."""

    edges: np.ndarray  # upper score of each block
    values: np.ndarray  # probability in each block

    def __call__(self, s: np.ndarray) -> np.ndarray:
        idx = np.searchsorted(self.edges, np.asarray(s, dtype=float), side="left")
        return self.values[np.minimum(idx, len(self.values) - 1)]


def fit_isotonic(s: np.ndarray, y: np.ndarray) -> Isotonic:
    order = np.argsort(s, kind="stable")
    s, y = np.asarray(s, dtype=float)[order], np.asarray(y, dtype=float)[order]
    blocks: list[list[float]] = []  # [sum of y, count, max score]
    for si, yi in zip(s, y, strict=True):
        blocks.append([yi, 1.0, si])
        while len(blocks) > 1 and blocks[-2][0] / blocks[-2][1] >= blocks[-1][0] / blocks[-1][1]:
            a, b = blocks[-2], blocks.pop()
            a[0] += b[0]
            a[1] += b[1]
            a[2] = b[2]
    edges = np.array([b[2] for b in blocks])
    values = np.array([b[0] / b[1] for b in blocks])
    return Isotonic(edges, values)


def ece(p: np.ndarray, y: np.ndarray, bins: int = 10) -> float:
    """Expected calibration error: mean |predicted - observed| over equal-width bins, weighted."""
    p, y = np.asarray(p, dtype=float), np.asarray(y, dtype=float)
    if not len(p):
        return 0.0
    idx = np.minimum((p * bins).astype(int), bins - 1)
    total = 0.0
    for b in range(bins):
        m = idx == b
        if m.any():
            total += m.sum() * abs(p[m].mean() - y[m].mean())
    return total / len(p)


# --- three states ----------------------------------------------------------------------------


@dataclass(frozen=True)
class Thresholds:
    error: float  # p >= error: `error`
    correct: float  # p < correct: `correct`; between: `unsure`


def choose_thresholds(
    p: np.ndarray, y: np.ndarray, max_false_flag: float, max_unsure: float
) -> Thresholds:
    """Thresholds from a calibration set.

    `error`: the lowest cut that marks at most `max_false_flag` of correct words as `error`.
    `correct`: as low as possible below it while at most `max_unsure` of all words are
    `unsure`, so as few mistakes as possible are passed as `correct`.
    """
    p, y = np.asarray(p, dtype=float), np.asarray(y, dtype=int)
    ok = np.sort(p[y == 0])
    allowed = int(np.floor(max_false_flag * len(ok) + 1e-9))  # ok words that may be `error`
    # the cut must sit above the (allowed+1)-th highest ok score
    t_err = float(np.nextafter(ok[-allowed - 1], np.inf)) if allowed < len(ok) else 0.0
    t_err = max(t_err, 1e-12)
    below = np.sort(p[p < t_err])[::-1]  # candidates for `unsure`, highest first
    room = int(np.floor(max_unsure * len(p) + 1e-9))
    if room == 0 or not len(below):
        return Thresholds(t_err, t_err)
    if room >= len(below):
        return Thresholds(t_err, 0.0)
    # `correct` cut just above the first word that does not fit in the unsure room
    t_ok = float(np.nextafter(below[room], np.inf))
    return Thresholds(t_err, min(t_ok, t_err))


def state(p: float, t: Thresholds, doubted: bool = True) -> str:
    """The word's state. With `doubted=False` (neither Prisma nor the check doubts the word) it
    is never `error`, only `unsure` at most: a flag needs a reason a teacher can be shown. The
    Hindi model otherwise flagged long words no source doubted, because its length weight is
    large (docs/RESULTS.md, Phase 3 follow-up)."""
    if p >= t.error:
        return "error" if doubted else "unsure"
    if p < t.correct:
        return "correct"
    return "unsure"


def rule_state(prisma_flag: bool, check_flag: bool) -> str:
    """The transparent agreement table."""
    if prisma_flag and check_flag:
        return "error"
    if prisma_flag or check_flag:
        return "unsure"
    return "correct"


# --- passages --------------------------------------------------------------------------------

# Reading-accuracy levels (Betts): 95% and up independent, 90-95% instructional, below 90%
# frustration. Accuracy, not WCPM, because synthetic voices read at a fixed speed.
BAND_LINES = (0.90, 0.95)
BANDS = ("frustration", "instructional", "independent")


def band(accuracy: float) -> str:
    return BANDS[sum(accuracy >= line for line in BAND_LINES)]


@dataclass(frozen=True)
class PassageDecision:
    accuracy_low: float  # every `unsure` word counted as a mistake
    accuracy_high: float  # every `unsure` word counted as correct
    band: str | None  # None: the interval crosses a band line, so the attempt needs a listen

    @property
    def needs_listen(self) -> bool:
        return self.band is None


def passage(states: list[str]) -> PassageDecision:
    n = len(states)
    if not n:
        return PassageDecision(0.0, 0.0, None)
    errors = states.count("error")
    unsure = states.count("unsure")
    low = (n - errors - unsure) / n
    high = (n - errors) / n
    b_low, b_high = band(low), band(high)
    return PassageDecision(low, high, b_low if b_low == b_high else None)
