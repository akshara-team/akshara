import json
from pathlib import Path

import pytest

from akshara.bench import evaluate, summarise
from akshara.core.align import insertion_near, score
from akshara.core.plant import (
    DISFLUENCY_V2,
    TAXONOMY,
    TYPES_V2,
    conjunct_candidates,
    matra_candidates,
    plant,
    reversal_candidates,
    vowel_length_candidates,
)
from akshara.dataset import Clip, family, load, split_of

ROOT = Path(__file__).resolve().parent.parent
HI = "मीना रोज़ सुबह स्कूल जाती है। वह अपने दोस्तों के साथ खेलती है।"
POOL = ["किताब", "पानी", "बादल", "सुबह", "चिड़िया", "मछली", "स्टेशन", "दोपहर", "खेलना"]


def test_every_type_has_a_taxonomy_entry():
    assert set(TYPES_V2) | set(DISFLUENCY_V2) == set(TAXONOMY)


def test_vowel_length_never_touches_the_last_akshara():
    for cand, _ in vowel_length_candidates("दोस्तों", "hi-IN"):
        assert cand.endswith("स्तों")
    assert ("सकूल", "स्कू->सकू") in conjunct_candidates("स्कूल", "hi-IN")


def test_matra_and_length_do_not_overlap():
    lengths = {c for c, _ in vowel_length_candidates("किताब", "hi-IN")}
    assert lengths and not lengths & {c for c, _ in matra_candidates("किताब", "hi-IN")}


def test_reversal_swaps_two_aksharas():
    assert ("ताकिब", "किता->ताकि") in reversal_candidates("किताब", "hi-IN")


@pytest.mark.parametrize("kind", [t for t in TYPES_V2 if t not in ("near", "skip")])
def test_each_word_type_plants_and_is_flagged_where_planted(kind):
    p = plant("x", "hi-IN", HI, [kind], POOL, seed=4)
    assert p is not None, kind
    planted = {e["index"] for e in p["errors"]}
    assert set(score(HI, p["read_as"], loose=True).flagged_indexes) == planted


@pytest.mark.parametrize("kind", ["decode", "hesitation"])
def test_fluency_types_keep_every_story_word(kind):
    p = plant("y", "hi-IN", HI, [kind], POOL, seed=5)
    assert p is not None
    s = score(HI, p["read_as"], loose=True)
    assert s.flagged_indexes == []
    if kind == "decode":
        assert insertion_near(s.marks, p["errors"][0]["index"])
    else:
        assert p["errors"][0]["pause_s"] > 0


def test_plant_v2_is_deterministic():
    kinds = ["visual", "matra"]
    assert plant("z", "kn-IN", "ರಾಮು ಪ್ರತಿದಿನ ಶಾಲೆಗೆ ಹೋಗುತ್ತಾನೆ ಮತ್ತು ಪುಸ್ತಕ ಓದುತ್ತಾನೆ", kinds, [], 3) == plant(
        "z", "kn-IN", "ರಾಮು ಪ್ರತಿದಿನ ಶಾಲೆಗೆ ಹೋಗುತ್ತಾನೆ ಮತ್ತು ಪುಸ್ತಕ ಓದುತ್ತಾನೆ", kinds, [], 3
    )


def test_split_follows_the_passage_family():
    assert family("sw-1-d") == family("sw-1-v2") == "sw-1"
    assert split_of("sw-1-d", "timbre") == split_of("sw-1", "timbre")
    assert split_of("sw-1", "other", holdout=frozenset({"other"})) == "holdout"
    shares = [split_of(f"p{i}", "e") for i in range(3000)]
    assert 0.55 < shares.count("tune") / 3000 < 0.65


def _clip(errors, read_as):
    return Clip("c", "p", "hi-IN", HI, read_as, errors, "none", None, None, split="test", set="t")


def test_evaluate_counts_catches_fluency_and_false_flags():
    p = plant("e", "hi-IN", HI, ["visual", "decode"], POOL, seed=1)
    assert p is not None
    r = evaluate(_clip(p["errors"], p["read_as"]), p["read_as"])
    assert r["false_flags"] == []
    by = {e["type"]: e for e in r["errors"]}
    assert by["visual"]["caught"] and by["decode"]["kept"]
    # a perfect reading misses the visual mistake and drops the decoding
    r2 = evaluate(_clip(p["errors"], p["read_as"]), HI)
    assert not {e["type"]: e for e in r2["errors"]}["visual"]["caught"]
    s = summarise([r, r2], by=("lang",))["hi-IN"]
    assert s["by_type"]["visual"] == {"planted": 2, "caught": 1}
    assert s["fluency"]["decode"] == {"planted": 2, "kept": 1, "unmeasured": 0}


def test_manifest_dry_run_is_perfect():
    path = ROOT / "data" / "bench" / "manifest-v1.jsonl"
    clips = load(path)
    assert {c.set for c in clips} == {"open", "disfluency", "v2"}
    for c in clips:
        r = evaluate(c, c.read_as)
        assert r["false_flags"] == [], c.clip_id
        assert all(e.get("caught", True) and e.get("kept") is not False for e in r["errors"])


def test_bench_reproduces_the_committed_base_report():
    report = json.loads((ROOT / "results" / "go_no_go_open_base.json").read_text("utf-8"))
    transcripts = {p["id"]: p["transcript"] for p in report["passages"]}
    clips = [c for c in load(ROOT / "data" / "bench" / "manifest-v1.jsonl")]
    clips = [
        c for c in clips if c.set == "open" and not c.conditions and c.passage_id in transcripts
    ]
    summary = summarise([evaluate(c, transcripts[c.passage_id]) for c in clips], by=("lang",))
    for lang, want in report["summary"]["loose"].items():
        got = summary[lang]
        assert (got["caught"], got["planted"]) == (want["caught"], want["planted"])
        assert (got["false_flags"], got["ok_words"]) == (want["false_flags"], want["ok_words"])
