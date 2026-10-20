import numpy as np

from akshara.core.pauses import cut, segments

RATE = 16000


def tone(seconds: float, amp: float = 0.5) -> np.ndarray:
    t = np.arange(int(RATE * seconds)) / RATE
    return amp * np.sin(2 * np.pi * 220 * t)


def silence(seconds: float) -> np.ndarray:
    return np.zeros(int(RATE * seconds))


def test_finds_three_segments_separated_by_pauses():
    x = np.concatenate([tone(0.6), silence(0.4), tone(0.5), silence(0.5), tone(0.7)])
    segs = segments(x, RATE)
    assert len(segs) == 3
    assert abs(segs[0][0] - 0.0) < 0.05 and abs(segs[0][1] - 0.6) < 0.05
    assert abs(segs[1][0] - 1.0) < 0.05
    assert abs(segs[2][1] - 2.7) < 0.05


def test_short_gap_does_not_split():
    x = np.concatenate([tone(0.5), silence(0.1), tone(0.5)])
    assert len(segments(x, RATE)) == 1


def test_all_silence_gives_no_segments():
    assert segments(silence(1.0), RATE) == []
    assert segments(np.array([]), RATE) == []


def test_quiet_noise_floor_is_ignored():
    rng = np.random.default_rng(0)
    noise = lambda s: 0.005 * rng.standard_normal(int(RATE * s))  # noqa: E731
    x = np.concatenate([tone(0.6) + noise(0.6), noise(0.5), tone(0.6) + noise(0.6)])
    assert len(segments(x, RATE)) == 2


def test_cut_pads_the_edges():
    x = np.concatenate([tone(0.5), silence(0.5), tone(0.5)])
    parts = cut(x, RATE, segments(x, RATE), pad_s=0.1)
    assert len(parts) == 2 and len(parts[0]) > int(RATE * 0.5)
