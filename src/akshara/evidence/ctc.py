"""CTC scoring and alignment in plain numpy, so the logic is testable without a model.

A CTC acoustic model gives, for every audio frame (20 ms here), a log-probability for each token
(letters of the script, a word separator, and a "blank" meaning "no new letter"). From that
matrix this module answers three questions:

- `viterbi`: how well does this exact letter sequence fit these frames, and which frames belong
  to which letter? (forced alignment)
- `forward`: the same fit summed over every way of placing the letters (the CTC probability)
- `greedy`: what would the model write here if it was not told the text? (free reading)

All scores are natural-log probabilities; -inf means the sequence cannot fit (too few frames).
"""

from dataclasses import dataclass

import numpy as np

NEG = -np.inf


def log_softmax(logits: np.ndarray) -> np.ndarray:
    m = logits.max(axis=-1, keepdims=True)
    z = logits - m
    return z - np.log(np.exp(z).sum(axis=-1, keepdims=True))


def _extend(tokens: list[int], blank: int) -> np.ndarray:
    z = np.full(2 * len(tokens) + 1, blank, dtype=np.int64)
    z[1::2] = tokens
    return z


def _skip_allowed(z: np.ndarray, blank: int) -> np.ndarray:
    """State s may be reached from s-2: it is a letter, and not the same letter as two back."""
    ok = np.zeros(len(z), dtype=bool)
    ok[2:] = (z[2:] != blank) & (z[2:] != z[:-2])
    return ok


def forward(logp: np.ndarray, tokens: list[int], blank: int) -> float:
    """log P(tokens | frames), summed over all CTC alignments."""
    if not tokens:
        return float(logp[:, blank].sum())
    z = _extend(tokens, blank)
    skip = _skip_allowed(z, blank)
    alpha = np.full(len(z), NEG)
    alpha[0], alpha[1] = logp[0, blank], logp[0, z[1]]
    for t in range(1, len(logp)):
        prev1 = np.concatenate(([NEG], alpha[:-1]))
        prev2 = np.where(skip, np.concatenate(([NEG, NEG], alpha[:-2])), NEG)
        alpha = np.logaddexp(np.logaddexp(alpha, prev1), prev2) + logp[t, z]
    return float(np.logaddexp(alpha[-1], alpha[-2]))


@dataclass(frozen=True)
class Alignment:
    score: float  # log-probability of the single best path
    spans: list[tuple[int, int]]  # per token: (first frame, last frame + 1)


def viterbi(logp: np.ndarray, tokens: list[int], blank: int) -> Alignment:
    """Best single path for `tokens`, with the frames each token occupies."""
    n_frames = len(logp)
    if not tokens:
        return Alignment(float(logp[:, blank].sum()), [])
    z = _extend(tokens, blank)
    skip = _skip_allowed(z, blank)
    delta = np.full(len(z), NEG)
    delta[0], delta[1] = logp[0, blank], logp[0, z[1]]
    back = np.zeros((n_frames, len(z)), dtype=np.int8)  # 0: stay, 1: from s-1, 2: from s-2
    for t in range(1, n_frames):
        cand = np.stack(
            [
                delta,
                np.concatenate(([NEG], delta[:-1])),
                np.where(skip, np.concatenate(([NEG, NEG], delta[:-2])), NEG),
            ]
        )
        back[t] = cand.argmax(axis=0)
        delta = cand.max(axis=0) + logp[t, z]
    s = len(z) - 1 if delta[-1] >= delta[-2] else len(z) - 2
    score = float(delta[s])
    if score == NEG:
        return Alignment(NEG, [])
    states = np.empty(n_frames, dtype=np.int64)
    for t in range(n_frames - 1, -1, -1):
        states[t] = s
        s -= int(back[t, s])
    spans = []
    for j in range(len(tokens)):
        frames = np.flatnonzero(states == 2 * j + 1)
        spans.append((int(frames[0]), int(frames[-1]) + 1))
    return Alignment(score, spans)


def greedy(logp: np.ndarray, blank: int) -> tuple[list[int], float]:
    """The model's own reading: best token per frame, repeats merged, blanks dropped.

    The score is the best path over all sequences, an upper bound for any `viterbi` score.
    """
    best = logp.argmax(axis=1)
    out, last = [], blank
    for b in best:
        if b != last and b != blank:
            out.append(int(b))
        last = b
    return out, float(logp.max(axis=1).sum())
