"""Turn data/open_passages/candidates.jsonl into a study set with planted mistakes.

Per language: 30 passages (balanced across reading levels), 26 with two planted mistakes of
different types, 4 read correctly. Same seed, same output.

    uv run python scripts/build_open_passages.py
"""

import hashlib
import itertools
import unicodedata
import json
import sys
from pathlib import Path

from akshara.core.plant import TYPES, plant
from akshara.core.text import words

ROOT = Path(__file__).resolve().parent.parent
DIR = ROOT / "data" / "open_passages"
LANGS = ("hi-IN", "kn-IN", "ta-IN")
PER_LANG, CLEAN = 30, 4
MIN_WORDS, MAX_WORDS = 9, 22
# Blurbs that talk about the book itself rather than telling the story.
META = ("पढ", "कहानी", "किताब", "पुस्तक", "ಪುಸ್ತಕ", "ಓದ", "புத்தக", "படி", "கதையை", "ಕಥೆಯನ್ನು")
PAIRS = list(itertools.combinations(TYPES, 2))


def rank(row: dict) -> str:
    return hashlib.sha256(row["id"].encode()).hexdigest()


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    cands = [
        json.loads(line)
        for line in (DIR / "candidates.jsonl").read_text(encoding="utf-8").splitlines()
    ]
    out, manifest = [], []
    for lang in LANGS:
        rows = [
            r
            for r in cands
            if r["lang"] == lang
            and MIN_WORDS <= len(words(r["reference"])) <= MAX_WORDS
            and not any(m in unicodedata.normalize("NFD", r["reference"]) for m in META)
        ]
        pool = sorted({w for r in rows for w in words(r["reference"])})
        by_level = {lv: sorted((r for r in rows if r["level"] == lv), key=rank) for lv in "12"}
        chosen = [
            r for pair in itertools.zip_longest(by_level["1"], by_level["2"]) for r in pair if r
        ]
        n, pair_i = 0, 0
        for r in chosen:
            if n >= PER_LANG:
                break
            clean = n >= PER_LANG - CLEAN
            p = None
            for _ in range(len(PAIRS)):  # try the next pair of types until one fits
                kinds = [] if clean else list(PAIRS[pair_i % len(PAIRS)])
                pair_i += 0 if clean else 1
                p = plant(r["id"], lang, r["reference"], kinds, pool)
                if p:
                    break
            if not p:
                continue
            out.append(p)
            manifest.append(
                {k: r[k] for k in ("id", "lang", "level", "title", "publisher", "url", "licence")}
            )
            n += 1
        print(f"{lang}: {n} passages from {len(rows)} eligible")
    (DIR / "passages.jsonl").write_text(
        "".join(json.dumps(p, ensure_ascii=False) + "\n" for p in out), encoding="utf-8"
    )
    (DIR / "sources.jsonl").write_text(
        "".join(json.dumps(m, ensure_ascii=False) + "\n" for m in manifest), encoding="utf-8"
    )
    counts = {t: sum(e["type"] == t for p in out for e in p["errors"]) for t in TYPES}
    print("planted by type:", counts, "| total", sum(counts.values()))


if __name__ == "__main__":
    main()
