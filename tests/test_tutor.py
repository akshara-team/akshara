"""The learner model in the app: placement items, mastery, and choosing the next passage."""

import pytest
from fastapi.testclient import TestClient
from test_api import wav

from akshara import passages
from akshara.api.app import PASSAGES, SOURCES, create_app
from akshara.core.text import words
from akshara.learner import tutor
from akshara.learner.bkt import Learner
from akshara.providers.fixture import FixtureSTT
from akshara.settings import Settings
from akshara.store import Store

CONSENT = {"consent_date": "2026-10-01"}  # a parent agreed (required since WP7)

BANK = passages.load(PASSAGES, SOURCES)


@pytest.fixture(scope="module")
def kn() -> tutor.Library:
    lib = tutor.library(BANK, "kn-IN")
    assert lib is not None
    return lib


def test_word_items_are_short_everyday_words(kn):
    from akshara.core.aksharas import split

    assert all(2 <= len(split(w, "kn-IN")) <= 4 for w in kn.simple_words)
    assert len(kn.simple_words) >= 10


def test_placement_items_are_sized_and_repeatable(kn):
    for task, n in (("letters", 5), ("words", 5)):
        item = tutor.placement_item(kn, task, 7)
        assert len(item["words"]) == n and len(set(item["words"])) == n
    para, story = tutor.placement_item(kn, "paragraph", 7), tutor.placement_item(kn, "story", 7)
    assert kn.rank[para["passage_id"]] < kn.rank[story["passage_id"]]
    assert para["words"] == words(para["text"])
    assert tutor.placement_item(kn, "words", 7) == tutor.placement_item(kn, "words", 7)
    assert tutor.placement_item(kn, "words", 7) != tutor.placement_item(kn, "words", 8)


def test_states_from_scorer_marks():
    trace = [
        {"op": "correct", "check": False},
        {"op": "correct", "check": True},
        {"op": "substituted"},
        {"op": "inserted"},
        {"op": "skipped"},
    ]
    assert tutor.states(trace) == ["correct", "unsure", "error", "error"]


def test_replay_follows_the_aser_tree():
    assert tutor.replay([["correct"] * 10, ["correct"] * 20]).level == "story"
    p = tutor.replay([["error"] * 10, ["correct"] * 5])
    assert p.level == "word" and not p.uncertain
    assert tutor.replay([["error"] * 10]).task == "words"


def weak_on(skill: str) -> Learner:
    learner = Learner()
    learner.mastery[skill], learner.seen[skill] = 0.1, 3
    return learner


def test_children_weak_on_different_skills_get_different_passages(kn):
    lo, hi = tutor.band("word", [])
    inside = [i for i in kn.ids if lo <= kn.rank[i] <= hi]
    skills = {i: {s for w in words(kn.texts[kn.ids.index(i)]) for s in kn.curriculum.skills_of(w)}
              for i in inside}  # fmt: skip
    a, b = inside[0], next(i for i in inside[1:] if skills[i] - skills[inside[0]])
    only_a = sorted(skills[a] - skills[b])[0]
    only_b = sorted(skills[b] - skills[a])[0]
    pick_a = tutor.next_passage(kn, weak_on(only_a), "word", [], [])
    pick_b = tutor.next_passage(kn, weak_on(only_b), "word", [], [])
    assert pick_a["passage_id"] != pick_b["passage_id"]
    assert only_a in skills[pick_a["passage_id"]] and only_b in skills[pick_b["passage_id"]]
    assert pick_a["reason"].startswith("practises")


def test_band_moves_with_recent_accuracy():
    base = tutor.band("paragraph", [])
    assert tutor.band("paragraph", [0.95, 0.92])[0] > base[0]
    assert tutor.band("paragraph", [0.5, 0.6])[0] < base[0]
    assert tutor.band("paragraph", [0.95, 0.5]) == base
    assert tutor.band(None, []) == base


def test_recent_passages_are_not_repeated(kn):
    first = tutor.next_passage(kn, Learner(), "paragraph", [], [])["passage_id"]
    again = tutor.next_passage(kn, Learner(), "paragraph", [first], [0.8])["passage_id"]
    assert again != first


def test_skill_summary_lists_weak_and_learned(kn):
    learner = Learner()
    weak, strong = kn.curriculum.skills[0].id, kn.curriculum.skills[1].id
    learner.mastery.update({weak: 0.2, strong: 0.99})
    learner.seen.update({weak: 2, strong: 5})
    early = kn.curriculum.skills[2].id  # high mastery, but seen too few times to call learned
    learner.mastery[early], learner.seen[early] = 0.99, 3
    s = tutor.skill_summary(learner, kn.curriculum)
    assert [x["id"] for x in s["working_on"]] == [weak]
    assert [x["id"] for x in s["learned"]] == [strong]


# ---- through the API


def client(stt=None) -> TestClient:
    settings = Settings(provider="fixture", db_path=":memory:")  # type: ignore[arg-type]
    return TestClient(create_app(settings, stt or FixtureSTT({}), BANK))


def test_placement_end_to_end_by_ear():
    c = client()
    kid = c.post("/v1/children", json={**CONSENT, "alias": "Ravi", "language": "kn-IN"}).json()[
        "id"
    ]
    pl = c.post(f"/v1/children/{kid}/placements").json()
    assert pl["item"]["task"] == "paragraph" and pl["level"] is None
    n = len(pl["item"]["words"])
    assert (
        c.post(f"/v1/placements/{pl['id']}/answer", json={"states": ["correct"]}).status_code == 422
    )
    pl = c.post(f"/v1/placements/{pl['id']}/answer", json={"states": ["error"] * n}).json()
    assert pl["item"]["task"] == "words" and pl["done"][0]["outcome"] == "fail"
    pl = c.post(f"/v1/placements/{pl['id']}/answer", json={"states": ["correct"] * 5}).json()
    assert pl["level"] == "word" and pl["item"] is None
    assert c.post(f"/v1/placements/{pl['id']}/answer", json={"states": []}).status_code == 409

    child = c.get(f"/v1/children/{kid}").json()
    assert child["level"] == "word" and child["level_uncertain"] is False
    assert set(c.get(f"/v1/children/{kid}/skills").json()) == {"working_on", "learned"}
    nxt = c.get(f"/v1/children/{kid}/next").json()
    assert BANK[nxt["passage_id"]]["lang"] == "kn-IN" and nxt["level"] == "word"


def test_unsure_marks_can_leave_placement_uncertain():
    c = client()
    kid = c.post("/v1/children", json={**CONSENT, "alias": "Uma", "language": "kn-IN"}).json()["id"]
    pl = c.post(f"/v1/children/{kid}/placements").json()
    n = len(pl["item"]["words"])
    pl = c.post(f"/v1/placements/{pl['id']}/answer", json={"states": ["error"] * n}).json()
    # 3 right, 2 unsure: passes only if unsure counts, so one more item is asked
    half = ["correct", "correct", "correct", "unsure", "unsure"]
    pl = c.post(f"/v1/placements/{pl['id']}/answer", json={"states": half}).json()
    assert pl["item"]["task"] == "words"
    pl = c.post(f"/v1/placements/{pl['id']}/answer", json={"states": half}).json()
    assert pl["uncertain"] is True and pl["level"] == "word"  # 6 right + 4 unsure at half = 80%


def test_reading_updates_mastery_once_per_upload(tmp_path):
    bank_id = next(i for i, p in BANK.items() if p["lang"] == "kn-IN")
    db = tmp_path / "a.sqlite"
    settings = Settings(provider="fixture", db_path=db)
    stt = FixtureSTT({bank_id: BANK[bank_id]["reference"]})
    c = TestClient(create_app(settings, stt, BANK))
    kid = c.post("/v1/children", json={**CONSENT, "alias": "Asha", "language": "kn-IN"}).json()[
        "id"
    ]

    def read(rid: str):
        r = c.post(
            "/v1/attempts",
            files={"audio": (f"{bank_id}.wav", wav(3), "audio/wav")},
            data={"passage_id": bank_id, "child_id": str(kid), "session": rid},
            headers={"X-Request-ID": rid},
        )
        assert r.status_code == 200
        return {s["skill"]: s["seen"] for s in Store(db).skills(kid)}

    once = read("r1")
    assert once and all(n >= 1 for n in once.values())
    assert read("r1") == once  # a resent upload teaches nothing
    twice = read("r2")  # a real second reading does
    assert all(twice[s] > once[s] for s in once)
    # read correctly twice: these skills now show as seen, none as "working on"
    assert c.get(f"/v1/children/{kid}/skills").json()["working_on"] == []


def test_placement_read_scores_the_current_item():
    holder: dict = {}

    class SkipsFirst:
        name = "skips-first"

        def transcribe(self, audio, language):
            return " ".join(holder["words"][1:])

    settings = Settings(provider="fixture", db_path=":memory:")  # type: ignore[arg-type]
    c = TestClient(create_app(settings, SkipsFirst(), BANK))
    kid = c.post("/v1/children", json={**CONSENT, "alias": "Hari", "language": "kn-IN"}).json()[
        "id"
    ]
    pl = c.post(f"/v1/children/{kid}/placements").json()
    holder["words"] = pl["item"]["words"]
    r = c.post(f"/v1/placements/{pl['id']}/read", files={"audio": ("a.wav", wav(2), "audio/wav")})
    assert r.status_code == 200
    got = r.json()["states"]
    assert got[0] == "error" and set(got[1:]) <= {"correct", "unsure"}
    assert c.get(f"/v1/placements/{pl['id']}").json()["done"] == []  # nothing recorded yet


# ---- akshara practice


class Says:
    name = "says"

    def __init__(self, text: str):
        self.text = text

    def transcribe(self, audio, language):
        return self.text


def practice_client(text: str, db=":memory:") -> TestClient:
    settings = Settings(provider="fixture", db_path=db)  # type: ignore[arg-type]
    return TestClient(create_app(settings, Says(text), BANK))


def test_aksharas_endpoint_splits_a_word():
    c = practice_client("")
    r = c.get("/v1/aksharas", params={"lang": "kn-IN", "word": " ಹಾರುತ್ತಿತ್ತು "})
    assert r.json() == {"word": "ಹಾರುತ್ತಿತ್ತು", "aksharas": ["ಹಾ", "ರು", "ತ್ತಿ", "ತ್ತು"]}
    assert c.get("/v1/aksharas", params={"lang": "en-US", "word": "a"}).status_code == 400
    assert c.get("/v1/aksharas", params={"lang": "kn-IN", "word": " "}).status_code == 400


@pytest.mark.parametrize(
    ("heard", "state"), [("ಹಾರುತ್ತಿತ್ತು", "correct"), ("ಓಡುತ್ತಿತ್ತು", "error"), ("", "error")]
)
def test_practice_scores_one_word(heard, state, tmp_path):
    db = tmp_path / "p.sqlite"
    c = practice_client(heard, db)
    kid = c.post("/v1/children", json={**CONSENT, "alias": "Ravi", "language": "kn-IN"}).json()[
        "id"
    ]
    r = c.post(
        "/v1/practice",
        files={"audio": ("w.wav", wav(1), "audio/wav")},
        data={"word": "ಹಾರುತ್ತಿತ್ತು", "lang": "kn-IN", "child_id": str(kid)},
    )
    assert r.status_code == 200 and r.json()["state"] == state
    assert Store(db).skills(kid), "the practice should teach the learner model"


@pytest.mark.parametrize(
    ("word", "heard", "state"),
    [
        ("நாளை", "நாலு", "unsure"),  # heard live from a correct reading
        ("குடை", "குடல்", "unsure"),  # heard live from a correct reading
        ("குடை", "மழை", "error"),  # a different word
        ("பார்க்கலாம்", "பார்க்கவில்லை", "error"),  # a longer word, two aksharas off
    ],
)
def test_practice_counts_a_near_word_as_not_sure(word, heard, state):
    c = practice_client(heard)
    r = c.post(
        "/v1/practice",
        files={"audio": ("w.wav", wav(1), "audio/wav")},
        data={"word": word, "lang": "ta-IN"},
    )
    assert r.status_code == 200 and r.json()["state"] == state


def test_practice_refuses_a_word_with_no_letters():
    c = practice_client("")
    r = c.post(
        "/v1/practice",
        files={"audio": ("w.wav", wav(1), "audio/wav")},
        data={"word": "?", "lang": "ta-IN"},
    )
    assert r.status_code == 400


def test_practice_without_a_child_teaches_nothing_and_checks_inputs():
    c = practice_client("ಹಾರುತ್ತಿತ್ತು")
    ok = c.post(
        "/v1/practice",
        files={"audio": ("w.wav", wav(1), "audio/wav")},
        data={"word": "ಹಾರುತ್ತಿತ್ತು", "lang": "kn-IN"},
    )
    assert ok.json()["state"] == "correct"
    bad = c.post(
        "/v1/practice",
        files={"audio": ("w.wav", wav(1), "audio/wav")},
        data={"word": "x", "lang": "kn-IN", "child_id": "999"},
    )
    assert bad.status_code == 404
