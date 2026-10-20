"""Fetch candidate passages from StoryWeaver's public catalogue (book descriptions).

Story text itself needs a login, so we use each book's published description: 2-3 sentences
written by people, with a reading level, publisher and URL. A few polite requests per language;
raw responses are cached under data/open_passages/raw/.

    uv run python scripts/fetch_storyweaver.py
"""

import json
import re
import sys
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "open_passages"
API = "https://storyweaver.org.in/api/v1/books-search"
LANGS = {"hi-IN": "Hindi", "kn-IN": "Kannada", "ta-IN": "Tamil"}
SCRIPT = {
    "hi-IN": re.compile(r"[\u0900-\u097F]"),
    "kn-IN": re.compile(r"[\u0C80-\u0CFF]"),
    "ta-IN": re.compile(r"[\u0B80-\u0BFF]"),
}
LEVELS = ("1", "2")
PAGES = 4
PER_PAGE = 24
MIN_WORDS, MAX_WORDS = 8, 28


def fetch(language: str, level: str, page: int) -> dict:
    cache = OUT / "raw" / f"{language}-L{level}-p{page}.json"
    if cache.exists():
        return json.loads(cache.read_text(encoding="utf-8"))
    r = httpx.get(
        API,
        params={
            "query": "",
            "page": page,
            "per_page": PER_PAGE,
            "languages[]": language,
            "levels[]": level,
        },
        headers={"User-Agent": "Mozilla/5.0 (akshara research; synthetic-data study)"},
        timeout=30,
    )
    r.raise_for_status()
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(r.text, encoding="utf-8")
    time.sleep(1.5)
    return r.json()


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    rows, seen = [], set()
    for lang, name in LANGS.items():
        for level in LEVELS:
            for page in range(1, PAGES + 1):
                for b in fetch(name, level, page)["data"]:
                    text = clean(b.get("description") or "")
                    n = len(text.split())
                    latin = re.search(r"[A-Za-z0-9]", text)
                    if b["id"] in seen or latin or not SCRIPT[lang].search(text):
                        continue
                    if not MIN_WORDS <= n <= MAX_WORDS:
                        continue
                    seen.add(b["id"])
                    rows.append(
                        {
                            "id": f"sw-{b['id']}",
                            "lang": lang,
                            "reference": text,
                            "level": b["level"],
                            "title": b["title"],
                            "publisher": (b.get("publisher") or {}).get("name"),
                            "url": f"https://storyweaver.org.in/en/stories/{b['slug']}",
                            "licence": "CC BY 4.0 (StoryWeaver site policy; per-book not checked)",
                        }
                    )
    out = OUT / "candidates.jsonl"
    out.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), "utf-8")
    for lang in LANGS:
        n = sum(1 for r in rows if r["lang"] == lang)
        print(f"{lang}: {n} candidates")
    print(f"wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
