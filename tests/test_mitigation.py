import numpy as np

from akshara.core.wavio import read_wav, write_wav
from akshara.mitigation import chunked_transcript
from akshara.providers.cache import CachedSTT
from akshara.providers.fixture import FixtureSTT

RATE = 16000


def tone(seconds):
    t = np.arange(int(RATE * seconds)) / RATE
    return (0.5 * np.sin(2 * np.pi * 220 * t) * 32767).astype(np.int16)


def silence(seconds):
    return np.zeros(int(RATE * seconds), dtype=np.int16)


def test_wav_round_trip(tmp_path):
    write_wav(tmp_path / "a.wav", tone(0.3), RATE)
    x, rate = read_wav(tmp_path / "a.wav")
    assert rate == RATE and len(x) == int(RATE * 0.3)


class ByPiece(FixtureSTT):
    """Answers by the order pieces arrive in."""

    def __init__(self, answers):
        super().__init__({})
        self.answers = list(answers)

    def transcribe(self, audio, language):
        return self.answers.pop(0)


def test_chunked_transcribes_each_piece_and_joins(tmp_path):
    x = np.concatenate([tone(0.6), silence(0.4), tone(0.6), silence(0.4), tone(0.6)])
    write_wav(tmp_path / "clip.wav", x, RATE)
    text, n = chunked_transcript(ByPiece(["एक", "दो", "तीन"]), tmp_path / "clip.wav", "hi-IN")
    assert (text, n) == ("एक दो तीन", 3)


def test_no_pause_falls_back_to_whole_clip(tmp_path):
    write_wav(tmp_path / "clip.wav", tone(1.0), RATE)
    text, n = chunked_transcript(ByPiece(["पूरा"]), tmp_path / "clip.wav", "hi-IN")
    assert (text, n) == ("पूरा", 1)


def test_cache_spends_nothing_on_a_repeat(tmp_path):
    write_wav(tmp_path / "clip.wav", tone(0.5), RATE)
    inner = ByPiece(["एक"])
    stt = CachedSTT(inner, tmp_path / "cache", min_interval_s=0)
    assert stt.transcribe(tmp_path / "clip.wav", "hi-IN") == "एक"
    assert (
        stt.transcribe(tmp_path / "clip.wav", "hi-IN") == "एक"
    )  # second call would pop an empty list
    assert stt.calls == 1
