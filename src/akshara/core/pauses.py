"""Find speech segments in a mono signal by looking for pauses. Prisma returns no word timings,
so the chunked re-check has to find its own cut points.

Energy based and deterministic: frames quieter than a fraction of the loud-speech level count as
silence, and a silence at least `min_pause_s` long separates two segments.
"""

import numpy as np


def segments(
    samples: np.ndarray,
    rate: int,
    *,
    frame_s: float = 0.02,
    min_pause_s: float = 0.25,
    min_segment_s: float = 0.15,
    rel_threshold: float = 0.1,
) -> list[tuple[float, float]]:
    """Return (start_s, end_s) for each stretch of speech, in order."""
    x = np.asarray(samples, dtype=np.float64)
    if x.ndim > 1:
        x = x.mean(axis=1)
    hop = max(1, int(rate * frame_s))
    n = len(x) // hop
    if n == 0:
        return []
    rms = np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(axis=1))
    loud = np.percentile(rms, 95)
    if loud <= 0:
        return []
    active = rms > loud * rel_threshold
    min_gap = max(1, int(round(min_pause_s / frame_s)))
    out: list[tuple[int, int]] = []
    start = None
    quiet = 0
    for i, a in enumerate(active):
        if a:
            if start is None:
                start = i
            quiet = 0
        elif start is not None:
            quiet += 1
            if quiet >= min_gap:
                out.append((start, i - quiet + 1))
                start, quiet = None, 0
    if start is not None:
        out.append((start, n - quiet))
    return [(s * frame_s, e * frame_s) for s, e in out if (e - s) * frame_s >= min_segment_s]


def cut(
    samples: np.ndarray, rate: int, segs: list[tuple[float, float]], pad_s: float = 0.1
) -> list[np.ndarray]:
    """Slice the signal at the segments, with a little padding so word edges are not clipped."""
    pad = int(rate * pad_s)
    return [samples[max(0, int(s * rate) - pad) : int(e * rate) + pad] for s, e in segs]
