"""Where each word of a reading probably is in the recording, so a teacher can hear just it.

Prisma returns no word timings and the per-word audio model is too heavy to run per request, so
this is an estimate: the speech found between pauses (`pauses.segments`) is laid end to end,
each reference word gets a share of it in proportion to its aksharas, and that share is mapped
back to clock time across the pauses. Each span is then padded, so the clip surely contains the
word, with a little of its neighbours. A skipped word gets the span where it should have been.

Good enough to listen to; not a measurement. The app labels these clips approximate.
Pure and deterministic.
"""

import numpy as np

from akshara.core.aksharas import split
from akshara.core.pauses import segments

PAD_S = 0.5


def _speech_to_clock(segs: list[tuple[float, float]], t: float, start: bool) -> float:
    """Clock time of the moment `t` seconds into the speech, counting only speech. At the edge
    between two stretches, a word's start belongs to the next stretch and its end to this one."""
    eps = 1e-9
    for a, b in segs:
        if t < b - a - eps or (not start and t <= b - a + eps):
            return a + t
        t -= b - a
    return segs[-1][1]


def spans(
    samples: np.ndarray, rate: int, words: list[str], lang: str, pad_s: float = PAD_S
) -> list[tuple[float, float]]:
    """One (start_s, end_s) per word, in reading order."""
    duration = len(samples) / rate if rate else 0.0
    if not words or duration <= 0:
        return [(0.0, duration)] * len(words)
    segs = segments(samples, rate) or [(0.0, duration)]
    speech = sum(e - s for s, e in segs)
    weights = [max(len(split(w, lang)), 1) for w in words]
    total = sum(weights)
    out, done = [], 0
    for w in weights:
        a = _speech_to_clock(segs, speech * done / total, start=True)
        done += w
        b = _speech_to_clock(segs, speech * done / total, start=False)
        out.append((max(0.0, a - pad_s), min(duration, b + pad_s)))
    return out
