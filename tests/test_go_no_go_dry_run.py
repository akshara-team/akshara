"""The example passages must score perfectly when read_as is used as the transcript.

This catches wrong error indexes in passage files.
"""

import json
from pathlib import Path

import pytest

from akshara.core.align import score

DATA = Path(__file__).resolve().parent.parent / "data" / "go_no_go"
FILES = [p for p in (DATA / "passages.example.jsonl", DATA / "passages.jsonl") if p.exists()]
ROWS = [
    json.loads(line)
    for f in FILES
    for line in f.read_text(encoding="utf-8").splitlines()
    if line.strip()
]


@pytest.mark.parametrize("row", ROWS, ids=[r["id"] for r in ROWS])
def test_planted_errors_match_read_as(row):
    s = score(row["reference"], row["read_as"])
    assert sorted(s.flagged_indexes) == sorted(e["index"] for e in row["errors"])
