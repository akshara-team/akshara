"""Minimal client for Gnani Prisma v2.5 speech-to-text (REST).

Docs: https://docs.gnani.ai/api/STT/speech-to-text
"""

import os
import time
from pathlib import Path

import httpx

from akshara.providers.base import ProviderError
from akshara.providers.ledger import record

STT_URL = "https://api.vachana.ai/stt/v3"
LANGUAGES = {"hi-IN", "kn-IN", "ta-IN"}


class STTError(ProviderError):
    pass


def transcribe(
    audio_path: str | Path,
    language_code: str,
    *,
    api_key: str | None = None,
    retries: int = 6,
    timeout_s: float = 60.0,
) -> dict:
    """Transcribe one clip verbatim. Returns the API's JSON response.

    Never sends bias_list: boosting the story's words would hide reading mistakes.
    """
    if language_code not in LANGUAGES:
        raise ValueError(f"unsupported language_code {language_code!r}")
    key = api_key or os.environ.get("GNANI_API_KEY")
    if not key:
        raise STTError("GNANI_API_KEY is not set")

    path = Path(audio_path)
    record("stt", file=path.name, bytes=path.stat().st_size)
    delay = 2.0
    for attempt in range(retries + 1):
        with path.open("rb") as f:
            resp = httpx.post(
                STT_URL,
                headers={"X-API-Key-ID": key},
                files={"audio_file": (path.name, f)},
                data={"language_code": language_code, "format": "verbatim"},
                timeout=timeout_s,
            )
        if resp.status_code in (429, 500, 502, 503, 504) and attempt < retries:
            time.sleep(delay)
            delay = min(delay * 2, 20.0)
            continue
        try:
            body = resp.json()
        except ValueError as e:
            if attempt < retries:  # an empty or HTML body is a gateway hiccup, not an answer
                time.sleep(delay)
                delay = min(delay * 2, 20.0)
                continue
            raise STTError(f"HTTP {resp.status_code}: {resp.text[:200]}") from e
        if resp.status_code != 200 or not body.get("success"):
            raise STTError(f"HTTP {resp.status_code}: {body.get('error', body)}")
        return body
    raise STTError("retries exhausted")


class PrismaSTT:
    """Prisma v2.5 behind the SpeechToText interface."""

    name = "prisma-v2.5"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key

    def transcribe(self, audio: Path, language: str) -> str:
        return transcribe(audio, language, api_key=self.api_key)["transcript"]
