"""Build a small set with repeats and self-corrections, from passages not in the main study set.

Per language: 10 passages, 5 with one repeated word and 5 with one slip-then-correct. The question
is whether a verbatim transcript keeps the extra word, so a screener can see hesitation.

    uv run python scripts/build_disfluency_passages.py
"""

import json
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_open_passages import DIR, LANGS, MAX_WORDS, META, MIN_WORDS, rank  # noqa: E402

from akshara.core.plant import plant  # noqa: E402
from akshara.core.text import words  # noqa: E402

PER_LANG = 10


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    cands = [json.loads(x) for x in (DIR / "candidates.jsonl").read_text("utf-8").splitlines()]
    used = {json.loads(x)["id"] for x in (DIR / "passages.jsonl").read_text("utf-8").splitlines()}
    out = []
    for lang in LANGS:
        rows = sorted(
            (
                r
                for r in cands
                if r["lang"] == lang
                and r["id"] not in used
                and MIN_WORDS <= len(words(r["reference"])) <= MAX_WORDS
                and not any(m in unicodedata.normalize("NFD", r["reference"]) for m in META)
            ),
            key=rank,
        )
        n = 0
        for r in rows:
            kind = "repeat" if n % 2 == 0 else "selfcorrect"
            p = plant(f"{r['id']}-d", lang, r["reference"], [kind], [])
            if p:
                out.append(p)
                n += 1
            if n >= PER_LANG:
                break
        print(f"{lang}: {n} passages")
    (DIR / "disfluency.jsonl").write_text(
        "".join(json.dumps(p, ensure_ascii=False) + "\n" for p in out), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
