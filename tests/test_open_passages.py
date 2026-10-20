import json
from pathlib import Path

import pytest

from akshara.core.align import score

DATA = Path(__file__).resolve().parent.parent / "data" / "open_passages"


def rows():
    path = DATA / "passages.jsonl"
    if not path.exists():
        pytest.skip("open passages not built")
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]


def test_every_planted_error_is_visible_to_the_scorer():
    for r in rows():
        s = score(r["reference"], r["read_as"], loose=True)
        assert set(s.flagged_indexes) == {e["index"] for e in r["errors"]}, r["id"]


def test_every_passage_has_a_source_and_licence_note():
    src = {
        json.loads(line)["id"]: json.loads(line)
        for line in (DATA / "sources.jsonl").read_text(encoding="utf-8").splitlines()
    }
    for r in rows():
        assert r["id"] in src and src[r["id"]]["url"].startswith("https://storyweaver.org.in/")
