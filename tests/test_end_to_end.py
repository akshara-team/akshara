"""WP10's end-to-end pass through the API (live mode, with a scripted speech service in place of
Prisma), one child from start to finish. The same journey on the web screens in mock mode is
web/src/endToEnd.test.tsx."""

from fastapi.testclient import TestClient
from test_review import speech_wav
from test_tutor import BANK

from akshara.api.app import create_app
from akshara.core.text import words
from akshara.settings import Settings


class Says:
    """A speech service that hears whatever the test sets next."""

    name = "scripted"

    def __init__(self):
        self.text = ""
        self.calls = 0

    def transcribe(self, audio, language):
        self.calls += 1
        return self.text


def test_one_child_start_to_finish(tmp_path):
    rec = tmp_path / "recordings"
    stt = Says()
    settings = Settings(provider="fixture", db_path=tmp_path / "e2e.sqlite", recordings_dir=rec)
    c = TestClient(create_app(settings, stt, BANK))
    wav = speech_wav()

    # 1. Added with a parent's consent; without it, refused.
    assert c.post("/v1/children", json={"alias": "Tara", "language": "kn-IN"}).status_code == 422
    r = c.post(
        "/v1/children", json={"alias": "Tara", "language": "kn-IN", "consent_date": "2026-10-20"}
    )
    assert r.status_code == 201
    kid = r.json()["id"]

    # 2. Placement: the first item recorded and scored, then the teacher confirms each item.
    pl = c.post(f"/v1/children/{kid}/placements").json()
    stt.text = " ".join(pl["item"]["words"])
    heard = c.post(
        f"/v1/placements/{pl['id']}/read", files={"audio": ("p.wav", wav, "audio/wav")}
    ).json()
    assert set(heard["states"]) == {"correct"}
    for _ in range(6):
        if pl["level"]:
            break
        pl = c.post(
            f"/v1/placements/{pl['id']}/answer",
            json={"states": ["correct"] * len(pl["item"]["words"])},
        ).json()
    assert pl["level"] and pl["item"] is None

    # 3. The learner model picks a story; Tara reads it part by part, with one slip.
    story = c.get(f"/v1/children/{kid}/next").json()["passage_id"]
    parts = c.get(f"/v1/passages/{story}").json()["parts"]
    target = words(parts[0])
    slip = max(range(len(target)), key=lambda i: len(target[i]))  # a long word, to practise
    for i, part in enumerate(parts):
        said = words(part)
        if i == 0:
            said[slip] = "ಬೇರೆ"
        stt.text = " ".join(said)
        r = c.post(
            "/v1/attempts",
            files={"audio": (f"{story}.wav", wav, "audio/wav")},
            data={"passage_id": story, "child_id": str(kid), "session": "s1", "part_index": i},
            headers={"X-Request-ID": f"tara-{i}"},
        )
        assert r.status_code == 200, r.text
    (reading,) = c.get(f"/v1/children/{kid}/readings").json()
    assert reading["correct"] == reading["total"] - 1

    # 4. She practises the missed word and reads it right.
    stt.text = target[slip]
    r = c.post(
        "/v1/practice",
        files={"audio": ("w.wav", wav, "audio/wav")},
        data={"word": target[slip], "lang": "kn-IN", "child_id": str(kid)},
    )
    assert r.json()["state"] == "correct"

    # 5. The teacher hears the slip (a recording is kept, with consent) and marks it right.
    items = [i for i in c.get("/v1/review?lang=kn-IN").json() if i.get("child_id") == kid]
    assert items, "a lone slip in a strong reading should be queued for the teacher"
    item = items[0]
    assert item["has_audio"]
    clip = c.get(f"/v1/attempts/{item['request_id']}/words/{item['index']}/clip")
    assert clip.status_code == 200 and clip.headers["X-Clip-Approximate"] == "true"
    c.post(
        "/v1/review",
        json={"request_id": item["request_id"], "index": item["index"], "result": "correct"},
    )
    (reading,) = c.get(f"/v1/children/{kid}/readings").json()
    assert reading["correct"] == reading["total"]

    # 6. The profile: one reading, a level, the consent date.
    child = c.get(f"/v1/children/{kid}").json()
    assert child["readings"] == 1 and child["level"] == pl["level"]
    assert child["consent_date"] == "2026-10-20"
    assert len(list(rec.iterdir())) == len(parts)

    # 7. Deleted: nothing about her is left, and no call was paid for twice.
    assert c.delete(f"/v1/children/{kid}").status_code == 204
    assert c.get(f"/v1/children/{kid}").status_code == 404
    assert not any(i.get("child_id") == kid for i in c.get("/v1/review").json())
    assert list(rec.iterdir()) == []
    assert stt.calls == 1 + len(parts) + 1  # placement read, each part, the practice word
