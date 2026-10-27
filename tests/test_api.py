import io
import wave

import pytest
from fastapi.testclient import TestClient

from akshara.api.app import create_app
from akshara.providers.base import ProviderError
from akshara.providers.fixture import FixtureSTT
from akshara.settings import Settings

BANK = {
    "p1": {"id": "p1", "lang": "hi-IN", "reference": "राम स्कूल जाता है"},
    # two sentences of 8 words: more than one 12-word part
    "p2": {
        "id": "p2", "lang": "hi-IN",
        "reference": "राम रोज़ सुबह जल्दी उठकर स्कूल जाता है। "
        "वहाँ वह अपने दोस्तों के साथ खेलता है।",
    },
}  # fmt: skip


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


def test_list_passages_filters_by_language():
    c = client(FixtureSTT({}))
    assert [p["id"] for p in c.get("/v1/passages?lang=hi-IN").json()] == ["p1", "p2"]
    assert c.get("/v1/passages?lang=ta-IN").json() == []


def test_reading_screen_is_served():
    r = client(FixtureSTT({})).get("/")
    assert r.status_code == 200 and "Akshara" in r.text


def test_attempt_carries_notice_and_no_check_on_exact_words():
    body = post(client(FixtureSTT({"clip": "राम स्कूल जाता"})), wav()).json()
    assert "does not prove" in body["notice"]
    assert not any(w["check"] for w in body["words"])


def post_part(c: TestClient, part_index: int | str, rid: str = "r-part"):
    return c.post(
        "/v1/attempts",
        files={"audio": ("clip.wav", wav(), "audio/wav")},
        data={"learner": "asha", "passage_id": "p2", "part_index": str(part_index)},
        headers={"X-Request-ID": rid},
    )


def test_passages_carry_parts():
    c = client(FixtureSTT({}))
    assert c.get("/v1/passages/p1").json()["parts"] == ["राम स्कूल जाता है"]
    parts = c.get("/v1/passages/p2").json()["parts"]
    assert parts == ["राम रोज़ सुबह जल्दी उठकर स्कूल जाता है।", "वहाँ वह अपने दोस्तों के साथ खेलता है।"]


def test_attempt_on_a_part_is_scored_against_that_part_only():
    c = client(FixtureSTT({"clip": "वहाँ वह अपने दोस्तों के साथ है"}))
    body = post_part(c, 1).json()
    assert body["part_index"] == 1
    assert [w["word"] for w in body["words"] if w["op"] == "skipped"] == ["खेलता"]
    assert len(body["words"]) == 8  # the first sentence is not counted as skipped
    assert c.get("/v1/attempts/r-part").json()["part_index"] == 1


def test_whole_passage_attempt_has_no_part_index():
    body = post(client(FixtureSTT({"clip": "राम स्कूल जाता है"})), wav()).json()
    assert body["part_index"] is None


@pytest.mark.parametrize("bad", [-1, 2, "x"])
def test_part_index_out_of_range_is_rejected(bad):
    r = post_part(client(FixtureSTT({"clip": "x"})), bad)
    assert r.status_code in (400, 422)


def test_real_bank_carries_title_level_and_credit():
    from akshara import passages as passage_bank
    from akshara.api.app import PASSAGES, SOURCES

    bank = passage_bank.load(PASSAGES, SOURCES)
    assert bank, "passage bank missing"
    assert all(p.get("title") and p.get("level") and p.get("publisher") for p in bank.values())
    settings = Settings(provider="fixture", db_path=":memory:")  # type: ignore[arg-type]
    c = TestClient(create_app(settings, FixtureSTT({}), bank))
    p = c.get("/v1/passages?lang=kn-IN").json()[0]
    assert p["title"] and p["level"] and p["credit"]["licence"].startswith("CC BY")


def test_paid_call_cap_is_a_clean_503():
    from akshara.providers.ledger import CapExceeded

    class Capped:
        name = "capped"

        def transcribe(self, audio, language):
            raise CapExceeded("cap")

    r = post(client(Capped()), wav(1))
    assert r.status_code == 503 and r.json()["detail"] == "paid-call cap reached"
