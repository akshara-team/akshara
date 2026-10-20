import io
import wave

import pytest
from fastapi.testclient import TestClient

from akshara.api.app import create_app
from akshara.providers.base import ProviderError
from akshara.providers.fixture import FixtureSTT
from akshara.settings import Settings

BANK = {"p1": {"id": "p1", "lang": "hi-IN", "reference": "राम स्कूल जाता है"}}


def wav(seconds: float = 1.0) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(8000)
        w.writeframes(b"\x00\x00" * int(8000 * seconds))
    return buf.getvalue()


def client(stt, **kw) -> TestClient:
    settings = Settings(provider="fixture", db_path=":memory:", **kw)  # type: ignore[arg-type]
    return TestClient(create_app(settings, stt, BANK))


def post(c: TestClient, data: bytes, rid: str | None = None, name: str = "clip.wav"):
    return c.post(
        "/v1/attempts",
        files={"audio": (name, data, "audio/wav")},
        data={"learner": "asha", "passage_id": "p1"},
        headers={"X-Request-ID": rid} if rid else {},
    )


def test_attempt_flags_skipped_word():
    c = client(FixtureSTT({"clip": "राम स्कूल जाता"}))
    r = post(c, wav())
    assert r.status_code == 200
    body = r.json()
    assert body["accuracy"] == 0.75
    assert [w["op"] for w in body["words"]] == ["correct", "correct", "correct", "skipped"]


def test_retry_with_same_request_id_makes_one_attempt():
    class Counting(FixtureSTT):
        calls = 0

        def transcribe(self, audio, language):
            Counting.calls += 1
            return super().transcribe(audio, language)

    c = client(Counting({"clip": "राम स्कूल जाता है"}))
    a = post(c, wav(), rid="r1").json()
    b = post(c, wav(), rid="r1").json()
    assert a == b and Counting.calls == 1
    assert c.get("/v1/attempts/r1").json()["accuracy"] == 1.0
    assert c.get("/v1/class/summary").json()[0]["attempts"] == 1


def test_rejects_bad_input():
    c = client(FixtureSTT({"clip": ""}), max_upload_bytes=50_000, max_audio_seconds=2.0)
    assert post(c, b"not a wav").status_code == 415
    assert post(c, wav(5)).status_code == 413
    assert post(c, wav(4)).status_code == 413  # over the size cap
    unknown = c.post(
        "/v1/attempts",
        files={"audio": ("c.wav", wav(), "audio/wav")},
        data={"learner": "a", "passage_id": "nope"},
    )
    assert unknown.status_code == 404


def test_provider_failure_is_a_502():
    class Broken:
        name = "broken"

        def transcribe(self, audio, language):
            raise ProviderError("down")

    assert post(client(Broken()), wav()).status_code == 502


def test_health():
    assert client(FixtureSTT({})).get("/health").json()["status"] == "ok"


def test_rate_limit():
    c = client(FixtureSTT({"clip": "राम"}))
    codes = [post(c, wav(), rid=f"r{i}").status_code for i in range(32)]
    assert codes.count(429) == 2


@pytest.mark.parametrize("path", ["/v1/passages/zzz", "/v1/attempts/zzz"])
def test_unknown_is_404(path):
    assert client(FixtureSTT({})).get(path).status_code == 404
