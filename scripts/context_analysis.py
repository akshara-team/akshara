"""Summarise the context-autocorrection experiment from results/go_no_go_context.json.

For each condition (-ok control, -m minimal pair, -d distant swap) report how often the planted
swap was caught, with Wilson 95% intervals, plus the exact misses.

    uv run python scripts/context_analysis.py
"""

import json
import sys
from math import sqrt
from pathlib import Path

from scipy.stats import fisher_exact

ROOT = Path(__file__).resolve().parent.parent
REPORT = ROOT / "results" / "go_no_go_context.json"
PASSAGES = ROOT / "data" / "go_no_go" / "passages.context.jsonl"


def wilson(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return 0.0, 0.0
    p = k / n
    d = 1 + z * z / n
    c = p + z * z / (2 * n)
    m = z * sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return (c - m) / d, (c + m) / d


def condition(row_id: str) -> str:
    return row_id.rsplit("-", 1)[1]


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    # Only compare frames where both the near-sound and the distant clip were transcribed.
    have = {p["id"] for p in report["passages"]}
    complete = {i.rsplit("-", 1)[0] for i in have if i.endswith("-m")} & {
        i.rsplit("-", 1)[0] for i in have if i.endswith("-d")
    }
    report["passages"] = [p for p in report["passages"] if p["id"].rsplit("-", 1)[0] in complete]
    if report.get("skipped"):
        print("skipped clips (not transcribed):", ", ".join(report["skipped"]))
    passages = {
        r["id"]: r for r in map(json.loads, PASSAGES.read_text(encoding="utf-8").splitlines())
    }
    for mode in ("strict", "loose"):
        print(f"\n[{mode}] swap caught / swaps (95% interval)")
        langs = ["hi-IN", "kn-IN", "ta-IN", "all"]
        print(f"{'condition':<12}" + "".join(f"{lang:>22}" for lang in langs))
        for cond, label in (("m", "near sound"), ("d", "distant")):
            cells = []
            for lang in langs:
                rows = [
                    p
                    for p in report["passages"]
                    if condition(p["id"]) == cond and lang in (p["lang"], "all")
                ]
                k = sum(1 for p in rows if not p[mode]["missed"])
                lo, hi = wilson(k, len(rows))
                cells.append(f"{k}/{len(rows)} ({lo:.0%}-{hi:.0%})")
            print(f"{label:<12}" + "".join(f"{c:>22}" for c in cells))
        by_cond = {
            c: [p for p in report["passages"] if condition(p["id"]) == c] for c in ("m", "d")
        }
        caught = {c: sum(1 for p in rows if not p[mode]["missed"]) for c, rows in by_cond.items()}
        total = {c: len(rows) for c, rows in by_cond.items()}
        _, p_value = fisher_exact(
            [[caught["m"], total["m"] - caught["m"]], [caught["d"], total["d"] - caught["d"]]]
        )
        print(f"near sound vs distant: Fisher exact two-sided p = {p_value:.2f}")
        ok = [p for p in report["passages"] if condition(p["id"]) == "ok"]
        ff = sum(len(p[mode]["false_flags"]) for p in ok)
        words_ok = sum(len(passages[p["id"]]["reference"].split()) for p in ok)
        print(f"control (read correctly): {ff} false flags in about {words_ok} words")

    print("\nMissed swaps (loose):")
    for p in report["passages"]:
        if p["loose"]["missed"]:
            row = passages[p["id"]]
            print(f"  {p['id']}\n    read as: {row['read_as']}\n    heard  : {p['transcript']}")


if __name__ == "__main__":
    main()
