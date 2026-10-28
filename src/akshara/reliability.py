"""The numbers on the app's "How reliable is this?" page, built from the committed study results.

The app scores with Prisma and the loose spelling rules on StoryWeaver passages, so the page
uses the open-passage study (`results/go_no_go_open_*.json`, loose scoring): the same files
`scripts/check_numbers.py` checks the write-up against. `scripts/build_reliability.py` writes
the result to the web app, and a test fails when the two differ.
"""

import json
from pathlib import Path

from akshara.core.stats import wilson

LANGUAGES = ("hi-IN", "kn-IN", "ta-IN")
# the four kinds of planted mistake, in the order the page lists them
KINDS = ("skip", "distant", "half", "near")
CONDITIONS = {
    "clear": "go_no_go_open_base.json",
    "phone": "go_no_go_open_phone8k.json",
    "noise": "go_no_go_open_noise5.json",
    "child": "go_no_go_open_child4.json",
}


def share(k: int, n: int) -> dict:
    lo, hi = wilson(k, n)
    return {"k": k, "n": n, "lo": round(lo, 3), "hi": round(hi, 3)}


def build(results: Path) -> dict:
    reports = {
        name: json.loads((results / file).read_text(encoding="utf-8"))["summary"]
        for name, file in CONDITIONS.items()
    }
    out: dict = {"sources": [f"results/{f}" for f in CONDITIONS.values()], "languages": {}}
    for lang in LANGUAGES:
        base = reports["clear"]["loose"][lang]
        out["languages"][lang] = {
            "passages": base["passages"],
            "mistakes": {
                kind: share(base["by_type"][kind]["caught"], base["by_type"][kind]["planted"])
                for kind in KINDS
            },
            "false_flags": share(base["false_flags"], base["ok_words"]),
            "conditions": {
                name: {
                    "catch": share(r["loose"][lang]["caught"], r["loose"][lang]["planted"]),
                    "false_flags": share(
                        r["loose"][lang]["false_flags"], r["loose"][lang]["ok_words"]
                    ),
                }
                for name, r in reports.items()
            },
        }
    return out


def dumps(data: dict) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2) + "\n"
