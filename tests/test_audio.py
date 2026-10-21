"""Feedback audio endpoint. No live calls: the TTS is a fake and the cache is a temp dir.

uv run pytest tests/test_audio.py -q
"""

import io
import wave
from pathlib import Path

from fastapi.testclient import TestClient

from akshara.api.app import create_app
from akshara.providers.audio_cache import CachedTTS
from akshara.providers.base import ProviderError
from akshara.providers.fixture import FixtureSTT
from akshara.settings import Settings


def wav_bytes(seconds: float = 0.1) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b"\x00\x00" * int(16000 * seconds))
    return buf.getvalue()


class FakeTTS:
    name = "fake-tts"

    def __init__(self, fail: bool = False):
        self.calls = 0
        self.fail = fail

    def synthesize(self, text: str, language: str, voice: str | None = None) -> bytes:
        if self.fail:
            raise ProviderError("down")
        self.calls += 1
        return wav_bytes()


def client(tmp_path: Path, fake: FakeTTS) -> TestClient:
    settings = Settings(provider="fixture", db_path=":memory:")
    tts = CachedTTS(fake, tmp_path / "audio")
    return TestClient(create_app(settings, FixtureSTT({}), {}, tts))


def test_returns_a_wav(tmp_path):
    fake = FakeTTS()
    r = client(tmp_path, fake).get("/v1/feedback/audio", params={"lang": "kn-IN", "word": "ಕೆಂಪು"})
    assert r.status_code == 200
    assert r.headers["content-type"] == "audio/wav"
    assert r.content[:4] == b"RIFF"
    assert fake.calls == 1


def test_second_request_is_served_from_cache(tmp_path):
    fake = FakeTTS()
    c = client(tmp_path, fake)
    params = {"lang": "kn-IN", "word": "ಕೆಂಪು"}
    for _ in range(3):
        assert c.get("/v1/feedback/audio", params=params).status_code == 200
    assert fake.calls == 1  # paid once, reused twice


def test_different_language_is_a_different_cache_entry(tmp_path):
    fake = FakeTTS()
    c = client(tmp_path, fake)
    c.get("/v1/feedback/audio", params={"lang": "kn-IN", "word": "ಕೆಂಪು"})
    c.get("/v1/feedback/audio", params={"lang": "ta-IN", "word": "கெம்பு"})
    assert fake.calls == 2


def test_rejects_unknown_language(tmp_path):
    params = {"lang": "en-US", "word": "hi"}
    assert client(tmp_path, FakeTTS()).get("/v1/feedback/audio", params=params).status_code == 400


def test_rejects_empty_and_overlong_words(tmp_path):
    c = client(tmp_path, FakeTTS())
    assert c.get("/v1/feedback/audio", params={"lang": "kn-IN", "word": "   "}).status_code == 400
    long = "ಕ" * 80
    assert c.get("/v1/feedback/audio", params={"lang": "kn-IN", "word": long}).status_code == 400


def test_provider_failure_is_a_502(tmp_path):
    r = client(tmp_path, FakeTTS(fail=True)).get(
        "/v1/feedback/audio", params={"lang": "kn-IN", "word": "ಕೆಂಪು"}
    )
    assert r.status_code == 502
