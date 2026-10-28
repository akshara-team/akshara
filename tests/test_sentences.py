"""Practice sentences: Evon writes, code checks, a teacher approves, the child reads.

No test calls Evon. Where a test needs "an Evon sentence" it reuses a story sentence and labels
it evon in a temporary file: these are test rows, not Evon output."""

import itertools
import json

import httpx
import pytest
from fastapi.testclient import TestClient
from test_api import wav
from test_children import CONSENT
from test_tutor import BANK

from akshara.api.app import create_app
from akshara.content import bank as B
from akshara.content import sentences as S
from akshara.learner import tutor
from akshara.providers import evon
from akshara.settings import Settings

LIB = tutor.library(BANK, "kn-IN")
CUR = LIB.curriculum
STORY = S.story_sentences(list(LIB.texts))


def a_passing(skill_kind: str = "letter:") -> tuple[str, str]:
    """A (skill, story sentence) pair that passes every check."""
    for s in CUR.skills:
        if not s.id.startswith(skill_kind):
            continue
        for text in STORY:
            if not S.problems(text, S.Target("kn-IN", s.id, ()), CUR):
                return s.id, text
    raise AssertionError("no passing pair in the bank")


SKILL, GOOD = a_passing()


# ---- checks


def test_a_sentence_from_a_story_passes():
    assert S.problems(GOOD, S.Target("kn-IN", SKILL, ()), CUR) == []


@pytest.mark.parametrize(
    ("text", "why"),
    [
        ("ಇದು ಒಂದು book ಆಗಿದೆ", "another script"),
        ("ಮನೆ", "words"),
        (" ".join(["ಮನೆ"] * 9), "words"),
    ],
)
def test_bad_sentences_are_refused(text, why):
    assert any(why in p for p in S.problems(text, S.Target("kn-IN", SKILL, ()), CUR))


def test_the_target_sound_must_be_used():
    other = next(s.id for s in CUR.skills if s.id.startswith("letter:") and s.id != SKILL)
    unused = next(t for t in STORY if all(other not in CUR.skills_of(w) for w in S.words(t)))
    assert "does not use the target sound" in S.problems(unused, S.Target("kn-IN", other, ()), CUR)


def test_blocked_words_and_repeats_are_refused():
    t = S.Target("kn-IN", SKILL, ())
    first = S.words(GOOD)[0]
    assert "uses a blocked word" in S.problems(GOOD, t, CUR, frozenset({first}))
    if len(S.words(GOOD)) >= 3:
        rep = " ".join([first] * 3)
        assert any("repeats" in p or "target" in p or "hard" in p for p in S.problems(rep, t, CUR))


def test_a_word_with_an_unknown_sound_is_too_hard():
    assert CUR.unknown("ಙಙಙ") or CUR.unknown("ೞಕ")  # letters the bank never uses


def test_evon_replies_are_parsed_strictly():
    assert S.parse('Sure! {"sentences": ["ಒಂದು", " ಎರಡು "]} hope it helps') == ["ಒಂದು", "ಎರಡು"]
    assert S.parse("ಒಂದು ಎರಡು") is None
    assert S.parse('{"sentences": "ಒಂದು"}') is None
    assert S.parse('{"sentences": ["ok", 3]') is None


def test_prompts_are_short_and_ask_for_json():
    t = S.Target("kn-IN", SKILL, S.examples(CUR, SKILL, list(LIB.texts)))
    msgs = S.prompt(t)
    assert [m["role"] for m in msgs] == ["system", "user"]
    assert '{"sentences"' in msgs[1]["content"] and "Kannada" in msgs[1]["content"]
    assert all(w in msgs[1]["content"] for w in t.examples)


# ---- bank and picking


def evon_file(tmp_path, rows) -> object:
    path = tmp_path / "sentences.jsonl"
    path.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), "utf-8")
    return path


def test_stale_evon_rows_are_dropped_on_load(tmp_path):
    good = {"id": "e1", "lang": "kn-IN", "skill": SKILL, "text": GOOD, "source": "evon"}
    bad = {
        "id": "e2",
        "lang": "kn-IN",
        "skill": SKILL,
        "text": "hello there friend",
        "source": "evon",
    }
    rows = B.load(LIB, evon_file(tmp_path, [good, bad]))
    assert [r["id"] for r in rows if r["source"] == "evon"] == ["e1"]
    assert any(r["source"] == "story" for r in rows)


def test_only_approved_evon_sentences_are_picked_and_they_come_first(tmp_path):
    rows = B.load(LIB, evon_file(tmp_path, [
        {"id": "e1", "lang": "kn-IN", "skill": SKILL, "text": GOOD, "source": "evon"},
    ]))  # fmt: skip
    # the same text is also a story sentence, so it appears once, as Evon's
    assert sum(r["text"] == GOOD for r in rows) == 1
    found = B.pick(rows, CUR, [SKILL], approved=set(), reads={})
    assert found is None or found[0]["source"] == "story"  # pending: never shown to a child
    row, _ = B.pick(rows, CUR, [SKILL], approved={"e1"}, reads={})
    assert row["id"] == "e1"
    t = S.Target("kn-IN", SKILL, ())
    others = [
        r
        for r in rows
        if r["id"] != "e1" and SKILL in r["skills"] and not S.problems(r["text"], t, CUR)
    ]
    row, _ = B.pick(rows, CUR, [SKILL], approved={"e1"}, reads={"e1": 3})
    if others:
        assert row["id"] != "e1"  # a sentence read three times gives way to a fresh one


# ---- API


def client(tmp_path, rows=()):
    settings = Settings(provider="fixture", db_path=tmp_path / "s.sqlite")
    path = evon_file(tmp_path, list(rows))

    class Says:
        name = "scripted"
        text = GOOD

        def transcribe(self, audio, language):
            return Says.text

    return TestClient(create_app(settings, Says(), BANK, sentences_path=path)), Says


def test_teacher_approves_then_the_child_gets_it_and_reads_it(tmp_path):
    row = {"id": "e1", "lang": "kn-IN", "skill": SKILL, "text": GOOD, "source": "evon"}
    c, says = client(tmp_path, [row])
    pending = c.get("/v1/sentences?lang=kn-IN&source=evon&status=pending").json()
    assert [p["id"] for p in pending] == ["e1"]
    r = c.post("/v1/sentences/e1/review", json={"status": "approved"})
    assert r.json()["status"] == "approved"
    assert c.get("/v1/sentences?lang=kn-IN&source=evon&status=pending").json() == []

    kid = c.post("/v1/children", json={**CONSENT, "alias": "Tara", "language": "kn-IN"}).json()[
        "id"
    ]
    got = c.get(f"/v1/children/{kid}/sentence").json()
    assert got["text"] and got["practises"]

    says.text = GOOD
    r = c.post(
        "/v1/sentences/e1/read",
        files={"audio": ("s.wav", wav(2), "audio/wav")},
        data={"child_id": str(kid)},
    ).json()
    assert r["accuracy"] == 1.0 and set(r["states"]) == {"correct"}
    assert c.get(f"/v1/children/{kid}/skills").json()  # the reading taught the model
    assert c.delete(f"/v1/children/{kid}").status_code == 204


def test_only_evon_sentences_can_be_reviewed_and_unknown_ones_404(tmp_path):
    c, _ = client(tmp_path)
    story = c.get("/v1/sentences?lang=kn-IN&source=story").json()[0]
    assert story["status"] == "story"
    assert (
        c.post(f"/v1/sentences/{story['id']}/review", json={"status": "approved"}).status_code
        == 409
    )
    assert c.post("/v1/sentences/nope/review", json={"status": "approved"}).status_code == 404
    assert c.get("/v1/sentences?lang=en-US").status_code == 400


# ---- the Evon client and the batch script, against a fake Evon


def test_evon_client_reads_an_openai_style_reply():
    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert body["messages"][0]["role"] == "system"
        assert body["chat_template_kwargs"] == {"enable_thinking": False}
        reply = "<think>let me see</think> ok"
        return httpx.Response(200, json={"choices": [{"message": {"content": reply}}]})

    http = httpx.Client(transport=httpx.MockTransport(handler))
    assert (
        evon.chat([{"role": "system", "content": "x"}], base_url="http://e/v1", client=http) == "ok"
    )
    bad = httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(500, text="no")))
    with pytest.raises(evon.EvonError):
        evon.chat([], base_url="http://e/v1", client=bad)


def test_evon_client_needs_a_server(monkeypatch):
    monkeypatch.delenv("EVON_BASE_URL", raising=False)
    with pytest.raises(evon.EvonError, match="EVON_BASE_URL"):
        evon.chat([])


def test_batch_keeps_only_sentences_that_pass(tmp_path, monkeypatch):
    import importlib.util
    from pathlib import Path

    path = Path(__file__).resolve().parents[1] / "scripts" / "evon_sentences.py"
    spec = importlib.util.spec_from_file_location("evon_sentences", path)
    script = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(script)

    monkeypatch.setattr(script, "OUT", tmp_path / "out.jsonl")
    monkeypatch.setattr(script, "REPORT", tmp_path / "report.json")
    replies = itertools.cycle([
        "not json at all",
        json.dumps({"sentences": [GOOD, "hello there friend"]}, ensure_ascii=False),
    ])  # fmt: skip
    monkeypatch.setattr(script, "chat", lambda messages: next(replies))
    monkeypatch.setattr(
        "sys.argv", ["x", "--lang", "kn-IN", "--all", "--limit", "40", "--per-skill", "1"]
    )
    assert script.main() == 0
    report = json.loads((tmp_path / "report.json").read_text(encoding="utf-8"))["languages"][
        "kn-IN"
    ]
    assert report["no_json"] >= 1 and report["sentences"] > report["passed"]
    kept = [
        json.loads(x) for x in (tmp_path / "out.jsonl").read_text(encoding="utf-8").splitlines()
    ]
    assert kept and all(r["text"] == GOOD and r["source"] == "evon" for r in kept)


def test_the_web_copy_of_the_sentences_is_fresh():
    import importlib.util
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]
    spec = importlib.util.spec_from_file_location(
        "build_sentences", root / "scripts" / "build_sentences.py"
    )
    script = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(script)
    page = (root / "web" / "src" / "data" / "sentences.json").read_text(encoding="utf-8")
    assert page == script.dumps(script.build()), "run scripts/build_sentences.py"
