"""Build the web demo's mock stories (one per language) from the open passages.

The Kannada demo is hand-authored in `web/src/api/mock.ts` because it reproduces the Figma
handoff's measurement example (20 words, 42 WCPM). Tamil and Hindi have no such fixture, so
this script takes the first open passage in each language, keeps its reference text and its
planted mistakes, splits it into parts, and writes `web/src/data/demo.json`.

Run after the passages change:

    uv run python scripts/build_demo_stories.py
"""

from __future__ import annotations

import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
PASSAGES = ROOT / "data" / "open_passages" / "passages.jsonl"
OUT = ROOT / "web" / "src" / "data" / "demo.json"
LANGS = ["ta-IN", "hi-IN"]

SPLIT = re.compile(r"(?<=[.।])\s+")


def words_with_errors(rec: dict) -> list[dict]:
    """The reference words, with each planted mistake as a substituted or skipped word."""
    mistakes = {e["index"]: e for e in rec.get("errors", [])}
    out: list[dict] = []
    for index, word in enumerate(rec["reference"].split()):
        error = mistakes.get(index)
        if error and error.get("type") == "skip":
            out.append(
                {"op": "skipped", "word": word, "said": None, "index": index, "check": False}
            )
        elif error and error.get("said"):
            out.append(
                {
                    "op": "substituted",
                    "word": word,
                    "said": error["said"],
                    "index": index,
                    "check": False,
                }
            )
        else:
            out.append(
                {"op": "correct", "word": word, "said": word, "index": index, "check": False}
            )
    return out


def parts(rec: dict) -> list[dict]:
    """Whole sentences, grouped into at most two parts so a child reads it in two goes."""
    sentences = [s.strip() for s in SPLIT.split(rec["reference"].strip()) if s.strip()]
    words = words_with_errors(rec)
    if len(sentences) <= 1:
        return [{"text": rec["reference"].strip(), "words": words}]

    # Cut at a sentence boundary nearest the middle by word count.
    counts = [len(s.split()) for s in sentences]
    total = sum(counts)
    running, cut = 0, 1
    for i, n in enumerate(counts[:-1]):
        running += n
        if running >= total / 2:
            cut = i + 1
            break

    first = sum(counts[:cut])
    head = " ".join(sentences[:cut])
    tail = " ".join(sentences[cut:])

    def renumber(items: list[dict]) -> list[dict]:
        return [{**w, "index": i} for i, w in enumerate(items)]

    return [
        {"text": head, "words": renumber(words[:first])},
        {"text": tail, "words": renumber(words[first:])},
    ]


def main() -> None:
    seen: dict[str, dict] = {}
    for line in PASSAGES.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        rec = json.loads(line)
        lang = rec.get("lang")
        if lang in LANGS and lang not in seen:
            seen[lang] = rec

    languages: dict[str, dict] = {}
    for lang in LANGS:
        rec = seen.get(lang)
        if rec is None:
            raise SystemExit(f"no passage for {lang}")
        languages[lang] = {
            "id": f"{lang[:2]}-101",
            "source": rec["id"],
            "level": "2",
            "parts": parts(rec),
        }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps({"languages": languages}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    for lang, story in languages.items():
        n = sum(len(p["words"]) for p in story["parts"])
        print(f"{lang}: {story['source']} -> {len(story['parts'])} part(s), {n} words")


if __name__ == "__main__":
    main()
