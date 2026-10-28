"""WP7: parent consent, deleting a child's data, and deleting old recordings."""

import os
import sqlite3
import time
from datetime import date, timedelta

from fastapi.testclient import TestClient
from test_review import BANK, speech_wav

from akshara import retention
from akshara.api.app import create_app
from akshara.providers.fixture import FixtureSTT
from akshara.settings import Settings
from akshara.store import Store

HEARD = "राम रोज़ सुबह जल्दी उठकर स्कूल जाती है"  # one word off: a review item


def app(tmp_path, **kw) -> TestClient:
    settings = Settings(provider="fixture", db_path=tmp_path / "t.sqlite", **kw)
    return TestClient(create_app(settings, FixtureSTT({"p1": HEARD}), BANK))


def add(c: TestClient, alias: str, consent: str | None = "2026-10-01") -> int:
    body = {"alias": alias, "language": "hi-IN"}
    if consent:
        body["consent_date"] = consent
    r = c.post("/v1/children", json=body)
    assert r.status_code == 201, r.text
    return r.json()["id"]


def read(c: TestClient, kid: int | None, rid: str, learner: str | None = None):
    data = {"passage_id": "p1", "session": rid}
    data |= {"child_id": str(kid)} if kid is not None else {"learner": learner or "x"}
    r = c.post(
        "/v1/attempts",
        files={"audio": ("p1.wav", speech_wav(), "audio/wav")},
        data=data,
        headers={"X-Request-ID": rid},
    )
    assert r.status_code == 200, r.text


# ---- consent


def test_a_child_cannot_be_added_without_a_consent_date(tmp_path):
    c = app(tmp_path)
    assert c.post("/v1/children", json={"alias": "A", "language": "hi-IN"}).status_code == 422
    future = (date.today() + timedelta(days=5)).isoformat()
    r = c.post("/v1/children", json={"alias": "A", "language": "hi-IN", "consent_date": future})
    assert r.status_code == 422
    kid = add(c, "Asha")
    assert c.get(f"/v1/children/{kid}").json()["consent_date"] == "2026-10-01"


def test_consent_can_be_redated_but_not_removed(tmp_path):
    c = app(tmp_path)
    kid = add(c, "Asha")
    r = c.patch(f"/v1/children/{kid}", json={"consent_date": None, "grade": 3})
    assert r.status_code == 200 and r.json()["consent_date"] == "2026-10-01"
    r = c.patch(f"/v1/children/{kid}", json={"consent_date": "2026-10-20"})
    assert r.json()["consent_date"] == "2026-10-20"


def test_recordings_are_kept_only_for_children_with_consent(tmp_path):
    c = app(tmp_path)
    read(c, add(c, "Asha"), "a1")
    read(c, None, "a2", learner="walk-in")  # no child record, so no consent
    Store(tmp_path / "t.sqlite").create_child("Old", "hi-IN")  # added before WP7
    old = c.get("/v1/children").json()
    read(c, next(k["id"] for k in old if k["alias"] == "Old"), "a3")
    kept = sorted(p.name for p in (tmp_path / "recordings").iterdir())
    assert kept == ["a1.wav"]


# ---- deleting a child's data


def rows_about(db, kid: int, request_ids: list[str]) -> dict[str, int]:
    con = sqlite3.connect(db)
    marks = ",".join("?" * len(request_ids))
    counts = {
        "learners": con.execute("SELECT COUNT(*) FROM learners WHERE id = ?", (kid,)),
        "attempts": con.execute("SELECT COUNT(*) FROM attempts WHERE learner_id = ?", (kid,)),
        "reviews": con.execute(
            f"SELECT COUNT(*) FROM reviews WHERE request_id IN ({marks})", request_ids
        ),
        "placements": con.execute("SELECT COUNT(*) FROM placements WHERE child_id = ?", (kid,)),
        "skill_state": con.execute("SELECT COUNT(*) FROM skill_state WHERE child_id = ?", (kid,)),
    }
    out = {k: v.fetchone()[0] for k, v in counts.items()}
    tables = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    con.close()
    # a new table holding child data must be added to Store.delete_child and to this test
    assert tables == set(counts), f"tables changed: {sorted(tables)}"
    return out


def test_delete_leaves_no_rows_or_files_behind(tmp_path):
    db, rec = tmp_path / "t.sqlite", tmp_path / "recordings"
    c = app(tmp_path)
    kid, other = add(c, "Asha"), add(c, "Uma")
    read(c, kid, "a1")
    read(c, kid, "a2")
    read(c, other, "b1")
    (item,) = [i for i in c.get("/v1/review").json() if i["request_id"] == "a1"]
    c.post("/v1/review", json={"request_id": "a1", "index": item["index"], "result": "correct"})
    Store(db).create_placement(kid, seed=1)
    before = rows_about(db, kid, ["a1", "a2"])
    assert all(before.values()), before  # every kind of data exists before the delete
    assert {p.name for p in rec.iterdir()} == {"a1.wav", "a2.wav", "b1.wav"}

    assert c.delete(f"/v1/children/{kid}").status_code == 204

    assert rows_about(db, kid, ["a1", "a2"]) == dict.fromkeys(before, 0)
    assert {p.name for p in rec.iterdir()} == {"b1.wav"}  # the other child's stays
    assert c.get(f"/v1/children/{kid}").status_code == 404
    assert c.get("/v1/attempts/a1").status_code == 404
    assert c.get(f"/v1/children/{other}/readings").json()  # untouched
    assert c.delete(f"/v1/children/{kid}").status_code == 404


# ---- retention


def test_old_recordings_are_deleted_and_the_reading_stays(tmp_path):
    db, rec = tmp_path / "t.sqlite", tmp_path / "recordings"
    c = app(tmp_path)
    kid = add(c, "Asha")
    read(c, kid, "a1")
    stray = rec / "stray.wav"
    stray.write_bytes(b"RIFF")
    old = time.time() - 40 * 86_400
    os.utime(stray, (old, old))
    store = Store(db)

    assert retention.purge(store, rec, days=30) == 1  # only the stray file is that old
    assert (rec / "a1.wav").exists() and not stray.exists()

    later = time.time() + 31 * 86_400
    assert retention.purge(store, rec, days=30, now=later) == 1
    assert not (rec / "a1.wav").exists()
    assert store.attempt("a1")["audio_path"] is None
    assert c.get(f"/v1/children/{kid}/readings").json()[0]["correct"] == 7  # words stay
    assert c.get("/v1/attempts/a1/words/0/clip").status_code == 404


def test_purge_runs_when_the_server_starts(tmp_path):
    rec = tmp_path / "recordings"
    c = app(tmp_path)
    read(c, add(c, "Asha"), "a1")
    con = sqlite3.connect(tmp_path / "t.sqlite")
    con.execute("UPDATE attempts SET created_at = created_at - 31 * 86400")
    con.commit()
    con.close()
    app(tmp_path)  # a restart
    assert not (rec / "a1.wav").exists()


def test_files_outside_the_folder_are_never_removed(tmp_path):
    outside = tmp_path / "keep.wav"
    outside.write_bytes(b"x")
    (tmp_path / "recordings").mkdir()
    retention.remove_files(tmp_path / "recordings", ["../keep.wav"])
    assert outside.exists()
