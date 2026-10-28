"""The app's reliability page shows the committed results, not numbers typed by hand."""

from pathlib import Path

from akshara.reliability import build, dumps

ROOT = Path(__file__).resolve().parent.parent


def test_the_web_page_numbers_match_the_results():
    page = (ROOT / "web" / "src" / "data" / "reliability.json").read_text(encoding="utf-8")
    assert page == dumps(build(ROOT / "results")), (
        "web/src/data/reliability.json is stale: run scripts/build_reliability.py"
    )


def test_numbers_agree_with_the_write_up():
    data = build(ROOT / "results")["languages"]
    near = sum(data[lang]["mistakes"]["near"]["k"] for lang in data)
    planted = sum(data[lang]["mistakes"]["near"]["n"] for lang in data)
    assert (near, planted) == (8, 39)  # "8 of 39" in docs/RESULTS.md
    skip = data["hi-IN"]["mistakes"]["skip"]
    assert (skip["k"], skip["n"]) == (12, 13)  # Hindi skipped words, "12/13"
