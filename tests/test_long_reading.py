"""Long readings are sent to the transcriber in windows under its clip limit."""

import itertools

import numpy as np

from akshara.core.pauses import windows
from akshara.core.wavio import write_wav
from akshara.service import transcribe_reading

RATE = 16000


def test_short_clip_is_one_window():
    assert windows([(0.5, 3.0)], 10.0, 25.0) == [(0.0, 10.0)]


def test_cuts_only_in_pauses_and_stays_under_the_limit():
    # ten 4 s phrases with 1 s pauses: 50 s in all
    segs = [(i * 5.0, i * 5.0 + 4.0) for i in range(10)]
    out = windows(segs, 50.0, 25.0)
    assert len(out) >= 2
    assert all(e - s <= 25.0 for s, e in out)
    assert out[0][0] == 0.0 and out[-1][1] == 50.0
    for (_, e), (s, _) in itertools.pairwise(out):
        assert e == s  # contiguous
        assert any(a[1] < e < b[0] for a, b in itertools.pairwise(segs))  # inside a pause


def test_one_long_stretch_is_cut_evenly():
    out = windows([(0.0, 60.0)], 60.0, 25.0)
    assert all(e - s <= 25.0 for s, e in out)
    assert out[-1][1] == 60.0 and len(out) == 3


def test_silent_windows_are_dropped():
    segs = [(0.0, 20.0), (55.0, 60.0)]
    out = windows(segs, 60.0, 25.0)
    assert all(any(s < w[1] and e > w[0] for s, e in segs) for w in out)


class CountingSTT:
    name = "counting"

    def __init__(self):
        self.calls = []

    def transcribe(self, audio, language):
        from akshara.service import audio_seconds

        self.calls.append(audio_seconds(audio))
        return f"w{len(self.calls)}"


def phrases(n: int, speak: float, pause: float) -> np.ndarray:
    t = np.arange(int(RATE * speak)) / RATE
    on = (0.5 * np.sin(2 * np.pi * 220 * t) * 32767).astype(np.int16)
    off = np.zeros(int(RATE * pause), dtype=np.int16)
    return np.concatenate([np.concatenate([on, off]) for _ in range(n)])


def test_long_reading_is_transcribed_in_order(tmp_path):
    path = tmp_path / "slow.wav"
    write_wav(path, phrases(12, 4.0, 1.0), RATE)  # 60 s
    stt = CountingSTT()
    text = transcribe_reading(stt, path, "kn-IN")
    assert len(stt.calls) == 3
    assert all(s <= 25.0 for s in stt.calls)
    assert abs(sum(stt.calls) - 60.0) < 1.5
    assert text == "w1 w2 w3"


def test_short_reading_is_one_call(tmp_path):
    path = tmp_path / "quick.wav"
    write_wav(path, phrases(3, 2.0, 0.5), RATE)
    stt = CountingSTT()
    transcribe_reading(stt, path, "kn-IN")
    assert len(stt.calls) == 1
