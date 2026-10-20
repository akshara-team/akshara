"""Minimal client for Gnani Timbre text-to-speech (REST).

Docs: https://docs.gnani.ai/api/TTS/tts-inference
"""

import os
import time

import httpx

from akshara.providers.base import ProviderError
from akshara.providers.ledger import record

TTS_URL = "https://api.vachana.ai/api/v1/tts/inference"
MODEL = "timbre-v3.0"
# Every v3.0 voice speaks all 10 languages.
VOICES = [
    "Shivani", "Lakshmi", "Kalpana", "Chetana", "Vasudha", "Riyaa", "Tarika",
    "Avinash", "Shubham", "Prakash", "Devansh", "Yashraj", "Harshad",
]  # fmt: skip


class TTSError(ProviderError):
    pass


def fix_wav_header(wav: bytes) -> bytes:
    """Timbre streams WAVs with 0xFFFFFFFF chunk sizes; write the real ones."""
    if wav[:4] != b"RIFF" or (i := wav.find(b"data")) < 0:
        return wav
    out = bytearray(wav)
    out[4:8] = (len(wav) - 8).to_bytes(4, "little")
    out[i + 4 : i + 8] = (len(wav) - i - 8).to_bytes(4, "little")
    return bytes(out)


def synthesize(
    text: str,
    language: str,
    voice: str,
    *,
    model: str = MODEL,
    speed: float = 1.0,
    sample_rate: int = 16000,
    api_key: str | None = None,
    retries: int = 3,
    timeout_s: float = 60.0,
) -> bytes:
    """Return a mono 16-bit WAV for `text`."""
    key = api_key or os.environ.get("GNANI_API_KEY")
    if not key:
        raise TTSError("GNANI_API_KEY is not set")
    payload = {
        "text": text,
        "voice": voice,
        "model": model,
        "language": language,
        "speed": speed,
        "audio_config": {"sample_rate": sample_rate, "num_channels": 1, "container": "wav"},
    }
    record("tts", chars=len(text), voice=voice, language=language)
    delay = 2.0
    for attempt in range(retries + 1):
        resp = httpx.post(TTS_URL, headers={"X-API-Key-ID": key}, json=payload, timeout=timeout_s)
        if resp.status_code in (429, 500, 503) and attempt < retries:
            time.sleep(delay)
            delay *= 2
            continue
        if resp.status_code != 200:
            raise TTSError(f"HTTP {resp.status_code}: {resp.text[:300]}")
        return fix_wav_header(resp.content)
    raise TTSError("retries exhausted")


class TimbreTTS:
    """Timbre v3.0 behind the TextToSpeech interface."""

    name = "timbre-v3.0"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key

    def synthesize(self, text: str, language: str, voice: str) -> bytes:
        return synthesize(text, language, voice, api_key=self.api_key)
