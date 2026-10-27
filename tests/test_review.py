"""The teacher's review queue: what goes in, word clips, and marks that replace the scorer's."""

import io
import wave

import numpy as np
from fastapi.testclient import TestClient

from akshara import review
from akshara.api.app import create_app
from akshara.providers.fixture import FixtureSTT
from akshara.settings import Settings
from akshara.store import Store

BANK = {
    "p1": {"id": "p1", "lang": "hi-IN", "reference": "राम रोज़ सुबह जल्दी उठकर स्कूल जाता है"},
}


def w(op, i, word="x", said=None, check=False):
    return {"op": op, "index": i, "word": word, "said": said, "check": check}


def test_reasons_pick_variant_words_and_slips_in_strong_readings():
    trace = [w("correct", 0, check=True), w("correct", 1), w("substituted", 2, said="y")]
    assert set(review.reasons(trace, 0.9)) == {0, 2}
    assert set(review.reasons(trace, 0.5)) == {0}  # a weak reading's slips are believed
    assert review.reasons(trace, 0.9)[2] == "the only slip in a strong reading"
    assert review.reasons([w("inserted", None)], 1.0) == {}


def test_apply_puts_the_teachers_mark_in_place():
    trace = [w("substituted", 0, word="राम", said="रम"), w("correct", 1, word="रोज़")]
    out = review.apply(trace, {0: "correct", 1: "skipped"})
    assert out[0]["op"] == "correct" and out[0]["said"] == "राम" and out[0]["teacher"] == "correct"
    assert out[1]["op"] == "skipped" and out[1]["said"] is None
    assert review.apply(trace, {})[0] == trace[0]


def speech_wav(seconds: float = 4.0) -> bytes:
    """Eight bursts of tone with pauses: something the pause finder can split."""
    rate = 16000
    burst = (0.4 * np.sin(2 * np.pi * 220 * np.arange(int(rate * 0.35)) / rate) * 32767).astype(
        np.int16
    )
    gap = np.zeros(int(rate * 0.15), dtype=np.int16)
    x = np.concatenate([np.concatenate([burst, gap]) for _ in range(8)])
    buf = io.BytesIO()
    with wave.open(buf, "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(rate)
        f.writeframes(x.tobytes())
    return buf.getvalue()


def setup(tmp_path, heard: str):
    db = tmp_path / "r.sqlite"
    c = TestClient(
        create_app(Settings(provider="fixture", db_path=db), FixtureSTT({"p1": heard}), BANK)
    )
    kid = c.post("/v1/children", json={"alias": "Asha", "language": "hi-IN"}).json()["id"]
    r = c.post(
        "/v1/attempts",
        files={"audio": ("p1.wav", speech_wav(), "audio/wav")},
        data={"passage_id": "p1", "child_id": str(kid), "session": "s1"},
        headers={"X-Request-ID": "a1"},
    )
    assert r.status_code == 200
    return c, kid, db


def test_a_slip_in_a_strong_reading_is_queued_with_its_clip(tmp_path):
    c, kid, db = setup(tmp_path, "राम रोज़ सुबह जल्दी उठकर स्कूल जाती है")  # one word off: 7/8
    (item,) = c.get("/v1/review?lang=hi-IN").json()
    assert item["kind"] == "word" and item["word"] == "जाता" and item["has_audio"]
    assert (tmp_path / "recordings" / "a1.wav").exists()

    clip = c.get(f"/v1/attempts/a1/words/{item['index']}/clip")
    assert clip.status_code == 200 and clip.headers["x-clip-approximate"] == "true"
    with wave.open(io.BytesIO(clip.content)) as f:
        assert 0.3 < f.getnframes() / f.getframerate() < 2.5  # a word, not the whole reading
    assert c.get("/v1/attempts/a1/words/99/clip").status_code == 404


def test_a_teachers_mark_clears_the_item_and_changes_the_reading(tmp_path):
    c, kid, db = setup(tmp_path, "राम रोज़ सुबह जल्दी उठकर स्कूल जाती है")
    before = {s["skill"]: s for s in Store(db).skills(kid)}
    (item,) = c.get("/v1/review?lang=hi-IN").json()
    assert c.get(f"/v1/children/{kid}/readings").json()[0]["correct"] == 7

    r = c.post("/v1/review", json={"request_id": "a1", "index": item["index"], "result": "correct"})
    assert r.status_code == 200
    assert c.get("/v1/review?lang=hi-IN").json() == []
    reading = c.get(f"/v1/children/{kid}/readings").json()[0]
    assert reading["correct"] == 8 and reading["accuracy"] == 1.0
    after = {s["skill"]: s for s in Store(db).skills(kid)}
    assert any(after[s]["seen"] > before[s]["seen"] for s in before)  # the model learned


def test_bad_marks_are_refused(tmp_path):
    c, _, _ = setup(tmp_path, "राम रोज़ सुबह जल्दी उठकर स्कूल जाती है")
    assert (
        c.post(
            "/v1/review", json={"request_id": "nope", "index": 0, "result": "correct"}
        ).status_code
        == 404
    )
    assert (
        c.post(
            "/v1/review", json={"request_id": "a1", "index": 50, "result": "correct"}
        ).status_code
        == 404
    )
    assert (
        c.post("/v1/review", json={"request_id": "a1", "index": 0, "result": "maybe"}).status_code
        == 422
    )


def test_no_recording_is_kept_for_an_in_memory_database():
    c = TestClient(
        create_app(
            Settings(provider="fixture", db_path=":memory:"), FixtureSTT({"p1": "राम"}), BANK
        )
    )  # type: ignore[arg-type]
    c.post("/v1/attempts", files={"audio": ("p1.wav", speech_wav(), "audio/wav")},
           data={"passage_id": "p1", "learner": "x"}, headers={"X-Request-ID": "m1"})  # fmt: skip
    assert c.get("/v1/attempts/m1/words/0/clip").status_code == 404


def test_uncertain_placements_are_queued(tmp_path):
    from akshara import passages
    from akshara.api.app import PASSAGES, SOURCES

    bank = passages.load(PASSAGES, SOURCES)
    c = TestClient(
        create_app(
            Settings(provider="fixture", db_path=tmp_path / "p.sqlite"), FixtureSTT({}), bank
        )
    )
    kid = c.post("/v1/children", json={"alias": "Uma", "language": "kn-IN"}).json()["id"]
    pl = c.post(f"/v1/children/{kid}/placements").json()
    n = len(pl["item"]["words"])
    half = ["correct", "correct", "correct", "unsure", "unsure"]
    for states in (["error"] * n, half, half):
        c.post(f"/v1/placements/{pl['id']}/answer", json={"states": states})
    items = c.get("/v1/review?lang=kn-IN").json()
    assert [i["kind"] for i in items] == ["placement"] and items[0]["child"] == "Uma"
