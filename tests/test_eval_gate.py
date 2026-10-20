"""Regression gate: the committed study results must keep meeting the pass line.

Reads cached results only, so it never calls the API. If a scorer change lowers catch rate or
raises false flags, this fails. Rerun the study and commit the new report to change the numbers.
"""

import json
from pathlib import Path

import pytest

RESULTS = Path(__file__).resolve().parent.parent / "results"
CONDITIONS = ["go_no_go_report", "go_no_go_phone8k", "go_no_go_noise15", "go_no_go_child4"]


@pytest.mark.parametrize("name", CONDITIONS)
def test_loose_scoring_meets_pass_line(name):
    path = RESULTS / f"{name}.json"
    if not path.exists():
        pytest.skip("report not present")
    summary = json.loads(path.read_text(encoding="utf-8"))["summary"]["loose"]
    for lang, r in summary.items():
        assert r["catch_rate"] >= 0.90, f"{name} {lang} catch {r['catch_rate']:.0%}"
        assert r["false_flag_rate"] <= 0.10, f"{name} {lang} false flags {r['false_flag_rate']:.0%}"
