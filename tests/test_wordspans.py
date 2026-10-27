import numpy as np

from akshara.core.wordspans import spans

RATE = 16000


def tone(s):
    t = np.arange(int(RATE * s)) / RATE
    return 0.5 * np.sin(2 * np.pi * 220 * t)


def silence(s):
    return np.zeros(int(RATE * s))


def test_words_said_between_pauses_land_in_their_stretch():
    # three words of one akshara each, 1 s apart: each should fall on its own stretch
    x = np.concatenate([silence(0.5), tone(0.6), silence(1.0), tone(0.6), silence(1.0), tone(0.6)])
    out = spans(x, RATE, ["क", "ख", "ग"], "hi-IN", pad_s=0.0)
    centres = [(a + b) / 2 for a, b in out]
    assert abs(centres[0] - 0.8) < 0.15
    assert abs(centres[1] - 2.4) < 0.15
    assert abs(centres[2] - 4.0) < 0.15


def test_longer_words_get_longer_spans_and_padding_is_clamped():
    x = tone(3.0)
    out = spans(x, RATE, ["क", "कहानी"], "hi-IN")  # 1 and 3 aksharas
    assert out[0][0] == 0.0 and out[-1][1] == 3.0
    raw = spans(x, RATE, ["क", "कहानी"], "hi-IN", pad_s=0.0)
    assert (raw[1][1] - raw[1][0]) > 2.5 * (raw[0][1] - raw[0][0])


def test_silence_or_nothing_still_returns_one_span_per_word():
    assert len(spans(silence(2.0), RATE, ["a", "b"], "hi-IN")) == 2
    assert spans(np.zeros(0), RATE, ["a"], "hi-IN") == [(0.0, 0.0)]
    assert spans(tone(1.0), RATE, [], "hi-IN") == []
