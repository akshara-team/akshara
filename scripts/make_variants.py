"""Make degraded copies of the base test audio, to see how Prisma holds up.

Reads data/go_no_go/audio/*.wav and writes data/go_no_go/audio_variants/<name>/<id>.wav.
No API calls, no credits. Everything is seeded, so re-runs give identical files.

    uv run python scripts/make_variants.py
    uv run python scripts/make_variants.py data/open_passages/audio data/open_passages/variants

Variants (all simulated, none is real classroom audio):
    phone8k      8 kHz, 300-3400 Hz band, mu-law companding (a basic phone call)
    noise15      pink noise at 15 dB signal-to-noise (a quiet room)
    noise5       pink noise at 5 dB signal-to-noise (a noisy classroom)
    child4       pitch up 4 semitones, same speed (rough stand-in for a child's voice)
    child4_phone child4 then phone8k (worst case)
"""

import sys
import wave
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "go_no_go" / "audio"
OUT = ROOT / "data" / "go_no_go" / "audio_variants"
SEED = 7


def read_wav(path: Path) -> tuple[np.ndarray, int]:
    with wave.open(str(path)) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float64)
    return x / 32768.0, sr


def write_wav(path: Path, x: np.ndarray, sr: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(x, -1.0, 1.0) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def phone(x: np.ndarray, sr: int) -> tuple[np.ndarray, int]:
    """8 kHz, 300-3400 Hz band-pass, 8-bit mu-law quantisation (G.711 style)."""
    if sr != 8000:
        x = signal.resample_poly(x, 8000, sr)
    sos = signal.butter(4, [300, 3400], btype="bandpass", fs=8000, output="sos")
    x = np.clip(signal.sosfilt(sos, x), -1.0, 1.0)
    mu = 255.0
    comp = np.sign(x) * np.log1p(mu * np.abs(x)) / np.log1p(mu)
    comp = np.round(comp * 127) / 127
    return np.sign(comp) * ((1 + mu) ** np.abs(comp) - 1) / mu, 8000


def pink_noise(n: int, rng: np.random.Generator) -> np.ndarray:
    spec = np.fft.rfft(rng.standard_normal(n))
    spec[1:] /= np.sqrt(np.arange(1, len(spec)))
    out = np.fft.irfft(spec, n)
    return out / np.sqrt(np.mean(out**2))


def add_noise(x: np.ndarray, snr_db: float, rng: np.random.Generator) -> np.ndarray:
    rms = np.sqrt(np.mean(x**2))
    return x + pink_noise(len(x), rng) * rms / (10 ** (snr_db / 20))


def _stft(x: np.ndarray, n: int, hop: int) -> np.ndarray:
    win = np.hanning(n)
    frames = np.array([x[i : i + n] * win for i in range(0, len(x) - n, hop)])
    return np.fft.rfft(frames, axis=1).T


def _istft(spec: np.ndarray, n: int, hop: int) -> np.ndarray:
    win = np.hanning(n)
    out = np.zeros(hop * (spec.shape[1] - 1) + n)
    norm = np.zeros_like(out)
    for t in range(spec.shape[1]):
        out[t * hop : t * hop + n] += np.fft.irfft(spec[:, t], n) * win
        norm[t * hop : t * hop + n] += win**2
    return out / np.maximum(norm, 1e-8)


def time_stretch(x: np.ndarray, rate: float, n: int = 1024, hop: int = 256) -> np.ndarray:
    """Phase-vocoder stretch: output is len(x) / rate long, pitch unchanged."""
    spec = _stft(x, n, hop)
    omega = 2 * np.pi * hop * np.arange(spec.shape[0]) / n
    phase = np.angle(spec[:, 0])
    cols = []
    for step in np.arange(0, spec.shape[1] - 1, rate):
        i, frac = int(step), step - int(step)
        mag = (1 - frac) * np.abs(spec[:, i]) + frac * np.abs(spec[:, i + 1])
        cols.append(mag * np.exp(1j * phase))
        dphi = np.angle(spec[:, i + 1]) - np.angle(spec[:, i]) - omega
        phase = phase + omega + dphi - 2 * np.pi * np.round(dphi / (2 * np.pi))
    return _istft(np.array(cols).T, n, hop)


def pitch_shift(x: np.ndarray, semitones: float) -> np.ndarray:
    """Raise pitch (and formants, like a smaller vocal tract) without changing duration."""
    ratio = 2 ** (semitones / 12)
    stretched = time_stretch(x, 1 / ratio)
    return signal.resample_poly(stretched, 1000, round(ratio * 1000))


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    src, out = (Path(sys.argv[1]), Path(sys.argv[2])) if len(sys.argv) == 3 else (SRC, OUT)
    files = sorted(src.glob("*.wav"))
    if not files:
        sys.exit(f"no audio in {src}; run scripts/make_test_audio.py first")
    for f in files:
        x, sr = read_wav(f)
        # one RNG per file, so adding files doesn't change the noise on existing ones
        rng = np.random.default_rng([SEED, sum(map(ord, f.stem))])
        child = pitch_shift(x, 4)
        variants = {
            "phone8k": phone(x, sr),
            "noise15": (add_noise(x, 15, rng), sr),
            "noise5": (add_noise(x, 5, rng), sr),
            "child4": (child, sr),
            "child4_phone": phone(child, sr),
        }
        for name, (y, ysr) in variants.items():
            write_wav(out / name / f.name, y, ysr)
    print(f"wrote {len(variants)} variants for {len(files)} clips to {out}")


if __name__ == "__main__":
    main()
