"""Minimal client for Gnani Prisma v2.5 speech-to-text (REST).

Docs: https://docs.gnani.ai/api/STT/speech-to-text
"""

import os
import time
from pathlib import Path

import httpx

STT_URL = "https://api.vachana.ai/stt/v3"
LANGUAGES = {"hi-IN", "kn-IN", "ta-IN"}


class STTError(RuntimeError):
    pass


def transcribe(
    audio_path: str | Path,
    language_code: str,
    *,
    api_key: str | None = None,
    retries: int = 3,
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
        if resp.status_code in (429, 500, 503) and attempt < retries:
            time.sleep(delay)
            delay *= 2
            continue
        try:
            body = resp.json()
        except ValueError as e:
            raise STTError(f"HTTP {resp.status_code}: {resp.text[:200]}") from e
        if resp.status_code != 200 or not body.get("success"):
            raise STTError(f"HTTP {resp.status_code}: {body.get('error', body)}")
        return body
    raise STTError("retries exhausted")
