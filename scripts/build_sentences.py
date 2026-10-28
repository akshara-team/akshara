"""Write the practice sentences the web app's mock mode uses, from the same bank the API uses.

    uv run python scripts/build_sentences.py

No API calls. Rerun after data/practice/sentences.jsonl (Evon's sentences) or the story bank
changes; tests/test_sentences.py fails until you do.
"""

import json
from pathlib import Path

from akshara import passages
from akshara.api.app import PASSAGES, SOURCES
from akshara.content import bank
from akshara.learner import tutor

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "web" / "src" / "data" / "sentences.json"
FIELDS = ("id", "text", "source", "skill", "skills")


def build() -> dict:
    stories = passages.load(PASSAGES, SOURCES)
    out = {}
    for lang in ("hi-IN", "kn-IN", "ta-IN"):
        rows = bank.load(tutor.library(stories, lang))
        out[lang] = [{k: r[k] for k in FIELDS} for r in rows]
    return {"languages": out}


def dumps(data: dict) -> str:
    return json.dumps(data, ensure_ascii=False, indent=1) + "\n"


def main() -> None:
    OUT.write_text(dumps(build()), encoding="utf-8", newline="\n")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
