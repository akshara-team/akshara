"""Build the second passage set, with the new mistake types (core/plant.py TYPES_V2).

Per language: 30 passages from the StoryWeaver candidates, preferring ones not used by the first
two sets. 26 get two mistakes from the new types (word mistakes and fluency events, rotating
through every pair), 4 are read correctly. Same seed, same output. Text only: audio is rendered
later from the manifest.

    uv run python scripts/build_bench_passages.py
"""

import itertools
import json
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_open_passages import DIR, LANGS, MAX_WORDS, META, MIN_WORDS, rank  # noqa: E402

from akshara.core.plant import TAXONOMY, plant  # noqa: E402
from akshara.core.text import words  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "bench" / "passages_v2.jsonl"
NEW = ("vowel_length", "matra", "visual", "conjunct", "reversal", "first_guess", "decode")
NEW += ("hesitation",)
PAIRS = [
    p for p in itertools.combinations(NEW, 2) if not all(TAXONOMY[k].family == "fluency" for k in p)
]
PER_LANG, CLEAN = 30, 4


def ids(path: Path) -> set[str]:
    return {json.loads(x)["id"] for x in path.read_text("utf-8").splitlines() if x}


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    cands = [json.loads(x) for x in (DIR / "candidates.jsonl").read_text("utf-8").splitlines()]
    used = ids(DIR / "passages.jsonl") | {
        i.removesuffix("-d") for i in ids(DIR / "disfluency.jsonl")
    }
    out = []
    for lang in LANGS:
        rows = [
            r
            for r in cands
            if r["lang"] == lang
            and MIN_WORDS <= len(words(r["reference"])) <= MAX_WORDS
            and not any(m in unicodedata.normalize("NFD", r["reference"]) for m in META)
        ]
        pool = sorted({w for r in rows for w in words(r["reference"])})
        # unused passages first, then the rest, each in a stable order
        rows.sort(key=lambda r: (r["id"] in used, rank(r)))
        n, pair_i = 0, 0
        for r in rows:
            if n >= PER_LANG:
                break
            clean = n >= PER_LANG - CLEAN
            p = None
            for _ in range(len(PAIRS)):
                kinds = [] if clean else list(PAIRS[pair_i % len(PAIRS)])
                pair_i += 0 if clean else 1
                p = plant(f"{r['id']}-v2", lang, r["reference"], kinds, pool)
                if p:
                    break
            if p:
                out.append(p)
                n += 1
        fresh = sum(1 for p in out if p["lang"] == lang and p["id"][:-3] not in used)
        print(f"{lang}: {n} passages ({fresh} not in earlier sets) from {len(rows)} eligible")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("".join(json.dumps(p, ensure_ascii=False) + "\n" for p in out), encoding="utf-8")
    counts: dict[str, int] = {}
    for p in out:
        for e in p["errors"]:
            counts[e["type"]] = counts.get(e["type"], 0) + 1
    print("planted by type:", dict(sorted(counts.items())), "| total", sum(counts.values()))


if __name__ == "__main__":
    main()
