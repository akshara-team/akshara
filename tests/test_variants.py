import importlib.util
from pathlib import Path

import numpy as np

_spec = importlib.util.spec_from_file_location(
    "make_variants", Path(__file__).resolve().parent.parent / "scripts" / "make_variants.py"
)
mv = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(mv)

SR = 16000


def _peak_hz(x: np.ndarray, sr: int) -> float:
    spec = np.abs(np.fft.rfft(x * np.hanning(len(x))))
    return float(np.argmax(spec) * sr / len(x))


def test_pitch_shift_raises_pitch_and_keeps_duration():
    t = np.arange(SR) / SR
    tone = 0.5 * np.sin(2 * np.pi * 440 * t)
    shifted = mv.pitch_shift(tone, 4)
    assert abs(len(shifted) - len(tone)) < 0.03 * SR
    assert abs(_peak_hz(shifted, SR) - 440 * 2 ** (4 / 12)) < 15


def test_noise_hits_requested_snr():
    rng = np.random.default_rng(0)
    x = 0.3 * np.sin(2 * np.pi * 300 * np.arange(SR) / SR)
    noise = mv.add_noise(x, 10, rng) - x
    snr = 20 * np.log10(np.sqrt(np.mean(x**2)) / np.sqrt(np.mean(noise**2)))
    assert abs(snr - 10) < 0.5


def test_phone_is_8khz_and_band_limited():
    t = np.arange(SR) / SR
    tone = 0.5 * np.sin(2 * np.pi * 6000 * t)  # above the phone band
    y, sr = mv.phone(tone, SR)
    assert sr == 8000
    assert np.sqrt(np.mean(y**2)) < 0.05
