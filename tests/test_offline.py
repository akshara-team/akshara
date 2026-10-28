"""A reading saved offline is sent again later, maybe twice (a reply lost on a bad connection,
two tabs). The same request id must give one attempt and one lesson for the learner model."""

import threading
import time

from fastapi.testclient import TestClient
from test_api import BANK
from test_children import CONSENT, read

from akshara.api.app import create_app
from akshara.providers.fixture import FixtureSTT
from akshara.settings import Settings
from akshara.store import Store


class Slow(FixtureSTT):
    """Takes a moment, so a second copy of the upload arrives while the first is scored."""

    def __init__(self, *args):
        super().__init__(*args)
        self.calls = 0

    def transcribe(self, audio, language):
        self.calls += 1
        time.sleep(0.2)
        return super().transcribe(audio, language)


def setup(tmp_path, name):
    db = tmp_path / f"{name}.sqlite"
    stt = Slow({"clip": " ".join(BANK["p2"]["reference"].split()[:4])})
    c = TestClient(create_app(Settings(provider="fixture", db_path=db), stt, BANK))
    kid = c.post("/v1/children", json={**CONSENT, "alias": "Asha", "language": "kn-IN"}).json()
    return c, stt, db, kid["id"]


def lessons(db) -> tuple[int, int]:
    s = Store(db)
    seen = s.db.execute("SELECT COALESCE(SUM(seen), 0) FROM skill_state").fetchone()[0]
    attempts = s.db.execute("SELECT COUNT(*) FROM attempts").fetchone()[0]
    return seen, attempts


def test_two_copies_at_once_count_once(tmp_path):
    # The test client may handle the two one after the other; under the real server they can
    # overlap, which is why app.py decides "is this a resend?" inside the scoring lock.
    c, _, db, kid = setup(tmp_path, "once")
    assert read(c, kid, 0, "s1", rid="offline-1").status_code == 200
    once = lessons(db)
    assert once[0] > 0 and once[1] == 1  # the reading did teach the model

    c, stt, db, kid = setup(tmp_path, "twice")
    replies = []
    threads = [
        threading.Thread(target=lambda: replies.append(read(c, kid, 0, "s1", rid="offline-1")))
        for _ in range(2)
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert [r.status_code for r in replies] == [200, 200]
    assert replies[0].json() == replies[1].json()
    assert stt.calls == 1  # one paid call
    assert lessons(db) == once  # one attempt, the learner model taught once


def test_a_resend_after_a_lost_reply_is_the_same_reading(tmp_path):
    c, stt, db, kid = setup(tmp_path, "later")
    first = read(c, kid, 0, "s1", rid="offline-2").json()
    again = read(c, kid, 0, "s1", rid="offline-2").json()
    assert first == again and stt.calls == 1
    assert len(c.get(f"/v1/children/{kid}/readings").json()) == 1
