"""Children the teacher manages, and their readings grouped by story session."""

from fastapi.testclient import TestClient
from test_api import BANK, wav

from akshara.api.app import create_app
from akshara.providers.fixture import FixtureSTT
from akshara.settings import Settings
from akshara.store import Store, summarise


class Script:
    """Returns the queued transcripts in order, one per call."""

    name = "script"

    def __init__(self, *texts):
        self.texts = list(texts)

    def transcribe(self, audio, language):
        return self.texts.pop(0)


def client(stt=None) -> TestClient:
    settings = Settings(provider="fixture", db_path=":memory:")  # type: ignore[arg-type]
    return TestClient(create_app(settings, stt or FixtureSTT({}), BANK))


def read(c, child_id, part, session, seconds=2.0, rid=None):
    return c.post(
        "/v1/attempts",
        files={"audio": ("clip.wav", wav(seconds), "audio/wav")},
        data={"passage_id": "p2", "child_id": str(child_id), "session": session,
              "part_index": str(part)},
        headers={"X-Request-ID": rid} if rid else {},
    )  # fmt: skip


def test_add_list_get_and_edit_a_child():
    c = client()
    r = c.post("/v1/children", json={"alias": "  Meena  K ", "language": "kn-IN", "grade": 2})
    assert r.status_code == 201
    child = r.json()
    assert child["alias"] == "Meena K" and child["grade"] == 2 and child["readings"] == 0
    assert child["latest"] is None
    assert [x["alias"] for x in c.get("/v1/children?lang=kn-IN").json()] == ["Meena K"]
    assert c.get("/v1/children?lang=hi-IN").json() == []
    r = c.patch(f"/v1/children/{child['id']}", json={"grade": 3, "avatar": "MK"})
    assert r.json()["grade"] == 3 and r.json()["avatar"] == "MK" and r.json()["alias"] == "Meena K"


def test_rejects_bad_children():
    c = client()
    assert c.post("/v1/children", json={"alias": "", "language": "kn-IN"}).status_code == 422
    assert c.post("/v1/children", json={"alias": "   ", "language": "kn-IN"}).status_code == 422
    assert c.post("/v1/children", json={"alias": "A", "language": "en-US"}).status_code == 422
    assert (
        c.post("/v1/children", json={"alias": "A", "language": "kn-IN", "grade": 0}).status_code
        == 422
    )
    assert c.post("/v1/children", json={"alias": "Ravi", "language": "kn-IN"}).status_code == 201
    assert c.post("/v1/children", json={"alias": "Ravi", "language": "ta-IN"}).status_code == 409
    other = c.post("/v1/children", json={"alias": "Uma", "language": "kn-IN"}).json()
    assert c.patch(f"/v1/children/{other['id']}", json={"alias": "Ravi"}).status_code == 409
    assert c.get("/v1/children/999").status_code == 404
    assert c.patch("/v1/children/999", json={"grade": 2}).status_code == 404
    assert c.get("/v1/children/999/readings").status_code == 404


def test_attempt_for_unknown_child_or_no_learner():
    c = client(Script("x"))
    assert read(c, 999, 0, "s1").status_code == 404
    r = c.post(
        "/v1/attempts",
        files={"audio": ("clip.wav", wav(), "audio/wav")},
        data={"passage_id": "p1"},
    )
    assert r.status_code == 422


def test_parts_of_one_session_are_one_reading():
    part0, part1 = "राम रोज़ सुबह जल्दी उठकर स्कूल जाता है", "वहाँ वह अपने दोस्तों के साथ खेलता है"
    # part 1 read twice: the second, better try is the one that counts
    c = client(Script(part0, "वहाँ वह", part1, part0))
    kid = c.post("/v1/children", json={"alias": "Asha", "language": "hi-IN"}).json()["id"]
    assert read(c, kid, 0, "s1").status_code == 200
    assert read(c, kid, 1, "s1").json()["learner"] == "Asha"
    assert read(c, kid, 1, "s1").status_code == 200
    assert read(c, kid, 0, "s2", seconds=4.0).status_code == 200

    readings = c.get(f"/v1/children/{kid}/readings").json()
    assert [r["session"] for r in readings] == ["s2", "s1"]  # newest first
    s1 = readings[1]
    assert s1["parts"] == [0, 1] and s1["total"] == 16 and s1["correct"] == 16
    assert s1["accuracy"] == 1.0 and s1["seconds"] == 4.0 and s1["wcpm"] == 240.0
    assert [w["word"] for w in s1["words"]][:2] == ["राम", "रोज़"]

    child = c.get(f"/v1/children/{kid}").json()
    assert child["readings"] == 2
    assert child["latest"]["wcpm"] == 120.0 and child["previous"]["accuracy"] == 1.0


def test_retried_upload_counts_once():
    c = client(Script("राम रोज़ सुबह", "unused"))
    kid = c.post("/v1/children", json={"alias": "Ravi", "language": "hi-IN"}).json()["id"]
    read(c, kid, 0, "s1", rid="same")
    read(c, kid, 0, "s1", rid="same")
    (reading,) = c.get(f"/v1/children/{kid}/readings").json()
    assert reading["correct"] == 3


def test_old_attempts_without_a_session_stand_alone():
    s = Store(":memory:")
    kid = s.learner("Old", "hi-IN")
    for rid in ("a", "b"):
        s.save_attempt(
            request_id=rid, learner_id=kid, passage_id="p1", language="hi-IN", provider="x",
            transcript="राम", duration_s=None, accuracy=1.0, wcpm=None,
            trace=[{"op": "correct", "word": "राम", "said": "राम", "index": 0}], latency_ms=1,
        )  # fmt: skip
    assert len(s.readings(kid)) == 2


def test_summary_ignores_insertions_and_handles_missing_time():
    group = [
        {"session_id": "s", "request_id": "r", "passage_id": "p", "language": "hi-IN",
         "created_at": 1.0, "part_index": None, "duration_s": None, "transcript": "a x",
         "trace": [{"op": "correct"}, {"op": "inserted"}, {"op": "skipped"}]},
    ]  # fmt: skip
    r = summarise(group)
    assert r["total"] == 2 and r["correct"] == 1 and r["wcpm"] is None and r["parts"] == []
