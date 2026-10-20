"""Check that headline numbers in the docs match the committed results. No API calls.

    uv run python scripts/check_numbers.py

Recomputes pooled catch counts from results/*.json and looks for them in the write-up,
captions and RESULTS.md. Exits 1 if a recomputed number is missing from the text.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RES, DOCS = ROOT / "results", ROOT / "docs"


def load(name: str):
    return json.loads((RES / name).read_text(encoding="utf-8"))


def pooled_by_type(report: dict) -> dict[str, tuple[int, int]]:
    out: dict[str, list[int]] = {}
    for r in report["summary"]["loose"].values():
        for kind, v in r["by_type"].items():
            c = out.setdefault(kind, [0, 0])
            c[0] += v["caught"]
            c[1] += v["planted"]
    return {k: (c, n) for k, (c, n) in out.items()}


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    text = {n: (DOCS / n).read_text(encoding="utf-8") for n in ("WRITEUP.md", "RESULTS.md")}
    text["CAPTIONS.md"] = (DOCS / "CAPTIONS.md").read_text(encoding="utf-8")
    wanted: list[tuple[str, str]] = []  # (what, a form it may be written in)
    counts = pooled_by_type(load("go_no_go_open_base.json"))
    for kind, (c, n) in counts.items():
        wanted.append((f"open base {kind}", f"{c} of {n}"))
    for cond in ("open_phone8k", "open_noise5", "open_child4"):
        for kind, (c, n) in pooled_by_type(load(f"go_no_go_{cond}.json")).items():
            wanted.append((f"{cond} {kind}", f"{c}/{n}"))
    dis = pooled_by_type(load("go_no_go_open_disfluency.json"))
    for kind, (c, n) in dis.items():
        wanted.append((f"disfluency {kind}", f"{c} of {n}"))
    iso = load("isolated_control.json")
    v = [o["verdict"] for o in iso]
    wanted.append(("isolated, read as spoken", f"{v.count('as_read')} non-word reads"))
    wanted.append(("isolated, corrected", f"{v.count('corrected')} corrected"))
    clips = load("halting_study.json")["clips"]
    right = sum(c["pieces"] == c["expected_pieces"] for c in clips)
    wanted.append(("pause finder right count", f"{right} of {len(clips)}"))
    bad = 0
    for what, form in wanted:
        where = [n for n, t in text.items() if form in t or form.replace(" of ", "/") in t]
        status = "ok " if where else "MISSING"
        bad += not where
        print(f"{status} {what}: {form}  {where}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
