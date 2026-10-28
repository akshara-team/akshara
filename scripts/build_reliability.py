"""Write the numbers for the app's "How reliable is this?" page from the committed results.

    uv run python scripts/build_reliability.py

No API calls. Rerun after any change to results/go_no_go_open_*.json; the test
`tests/test_reliability.py` fails until you do.
"""

from pathlib import Path

from akshara.reliability import build, dumps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "web" / "src" / "data" / "reliability.json"


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(dumps(build(ROOT / "results")), encoding="utf-8", newline="\n")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
