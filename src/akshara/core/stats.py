from math import sqrt


def wilson(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    """95% Wilson score interval for k successes in n trials."""
    if n == 0:
        return 0.0, 0.0
    p = k / n
    d = 1 + z * z / n
    c = p + z * z / (2 * n)
    m = z * sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return (c - m) / d, (c + m) / d


def auc(pos: list[float], neg: list[float]) -> float | None:
    """Chance a random positive scores above a random negative (ties count half)."""
    if not pos or not neg:
        return None
    import bisect

    neg = sorted(neg)
    wins = 0.0
    for p in pos:
        lo, hi = bisect.bisect_left(neg, p), bisect.bisect_right(neg, p)
        wins += lo + 0.5 * (hi - lo)
    return wins / (len(pos) * len(neg))
