import json
from pathlib import Path

from akshara.core.text import words
from akshara.dataset import HOLDOUT_ENGINE, load, split_of

ROOT = Path(__file__).resolve().parent.parent
BENCH = ROOT / "data" / "bench"


def test_holdout_engine_is_never_tuned_or_calibrated_on():
    clips = load(BENCH / "manifest-v1.jsonl")
    held = [c for c in clips if c.engine == HOLDOUT_ENGINE]
    assert held, "the manifest lists the held-out engine's clips"
    assert {c.split for c in held} == {"holdout"}
    assert all(c.engine != HOLDOUT_ENGINE for c in clips if c.split != "holdout")
    assert split_of("anything", HOLDOUT_ENGINE) == "holdout"


def test_holdout_reads_exactly_the_test_passages_in_four_conditions():
    clips = load(BENCH / "manifest-v1.jsonl")
    test = {c.passage_id for c in clips if c.split == "test" and c.engine != HOLDOUT_ENGINE}
    held = [c for c in clips if c.engine == HOLDOUT_ENGINE]
    assert {c.passage_id for c in held} == test
    conds = {"+".join(c.conditions) or "clean" for c in held}
    assert conds == {"clean", "phone8k", "noise5", "child4"}


def test_render_list_rebuilds_what_the_reader_says():
    clips = {c.clip_id: c for c in load(BENCH / "manifest-v1.jsonl")}
    rows = [json.loads(x) for x in (BENCH / "holdout_render.jsonl").read_text("utf-8").splitlines()]
    assert len(rows) == sum(
        1 for c in clips.values() if c.engine == HOLDOUT_ENGINE and not c.conditions
    )
    for r in rows:
        c = clips[r["clip_id"]]
        said = " ".join(t for t, _ in r["pieces"] if t)
        assert said.split() == c.read_as.split()
        assert r["words"] == len(words(c.read_as))
        assert r["audio"] == c.audio
