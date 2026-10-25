"""Phase 3: fuse Prisma and the per-word check into three states, and score it. No API calls.

    uv run python scripts/fusion_report.py           # fit on tune, show calibrate (development)
    uv run python scripts/fusion_report.py --test    # also score test (only after PREDICTIONS.md)

Reads results/evidence_mms.jsonl and Prisma's committed transcripts; writes
results/fusion_report.json (or fusion_report_dev.json without --test).

Fixed rules (docs/PREDICTIONS.md, Phase 3):
- the logistic model is fitted per language on `tune` (all audio conditions)
- calibration (isotonic) and the two thresholds are fitted per language on `calibrate`:
  at most 5% of correct words `error`, at most 10% of words `unsure`
- the rule table uses the Phase 2 check threshold (from `tune`, clean, 5%)
- `test` is scored once, with everything frozen
"""

import argparse
import json
import sys
from collections import defaultdict
from functools import cache
from pathlib import Path

import numpy as np

from akshara.core.align import align
from akshara.core.stats import wilson
from akshara.core.text import loose_key, words
from akshara.dataset import load
from akshara.evidence.scoring import heard_as_said, labels, threshold_at
from akshara.fusion import (
    FEATURES,
    WordInput,
    band,
    choose_thresholds,
    ece,
    features,
    fit_isotonic,
    fit_logistic,
    passage,
    rule_state,
    state,
)

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "data" / "bench" / "manifest-v1.jsonl"
EVIDENCE = ROOT / "results" / "evidence_mms.jsonl"

LANGS = ("hi-IN", "kn-IN", "ta-IN")
CONDS = ("clean", "phone8k", "noise5", "child4")
GROSS = ("skip", "distant", "half", "first_guess", "reversal")
SUBTLE = ("near", "visual", "matra", "conjunct", "vowel_length")
MAX_FF = 0.05
MAX_UNSURE = 0.10
L2 = 1.0


@cache
def transcripts(path: str) -> dict[str, str]:
    data = json.loads((ROOT / path).read_text(encoding="utf-8"))
    return {p["id"]: p["transcript"] for p in data["passages"]}


def prisma_marks(ref: list[str], text: str, loose: bool) -> dict[int, tuple[str, str | None]]:
    marks = align(ref, words(text), loose_key if loose else str)
    return {m.ref_index: (m.op, m.said) for m in marks if m.ref_index is not None}


def load_rows() -> list[dict]:
    ev = {}
    for line in EVIDENCE.read_text(encoding="utf-8").splitlines():
        r = json.loads(line)
        ev[r["clip_id"]] = r
    rows = []
    for c in load(MANIFEST):
        if c.clip_id not in ev or not c.report:
            continue
        text = transcripts(c.report).get(c.passage_id)
        if text is None:
            continue
        ref = words(c.reference)
        loose = prisma_marks(ref, text, loose=True)
        strict = prisma_marks(ref, text, loose=False)
        by_index = {w["index"]: w for w in ev[c.clip_id]["words"]}
        mistakes, fluency = labels(c)
        said = {x["index"]: x.get("said") for x in c.errors}
        for i, word in enumerate(ref):
            w = by_index.get(i)
            if w is None:
                continue  # no evidence (no letter known to the model); not scored
            variant = loose_key(w["free_text"]) == loose_key(w["word"])
            op = loose[i][0]
            wi = WordInput(
                prisma_op=op,
                prisma_strict_flag=strict[i][0] in ("substituted", "skipped"),
                margin_alt=w["margin_alt"],
                margin_free=0.0 if variant else w["margin_free"],
                free_edits=0 if variant else w["free_edits"],
                letters=len(word),
            )
            check_score = (
                wi.margin_free if wi.margin_alt is None else min(wi.margin_free, wi.margin_alt)
            )
            s = said.get(i)
            kind = mistakes.get(i)
            audible_mms = audible_prisma = None
            if kind in SUBTLE and s:
                audible_mms = heard_as_said(w["free_text"], word, s)
                p_said = strict[i][1]
                audible_prisma = bool(p_said) and heard_as_said(p_said, word, s)
            rows.append(
                {
                    "clip": c.clip_id,
                    "passage": c.passage_id,
                    "lang": c.lang,
                    "split": c.split,
                    "cond": "+".join(c.conditions) or "clean",
                    "index": i,
                    "mistake": kind,
                    "fluency": fluency.get(i),
                    "y": int(kind is not None),
                    "x": features(wi),
                    "prisma": op in ("substituted", "skipped"),
                    "check_score": check_score,
                    "audible_mms": audible_mms,
                    "audible_prisma": audible_prisma,
                }
            )
    return rows


def rate(k: int, n: int) -> dict:
    lo, hi = wilson(k, n)
    return {"k": k, "n": n, "rate": k / n if n else None, "lo": lo, "hi": hi}


def fmt(r: dict | None) -> str:
    if not r or not r["n"]:
        return "—"
    lo, hi = max(r["lo"], 0.0), min(r["hi"], 1.0)
    return f"{r['k']}/{r['n']} {r['rate']:.0%} ({lo:.0%}–{hi:.0%})"


def summary(rows: list[dict], key: str) -> dict:
    """Word-level numbers for one system; `key` holds each row's state."""
    ok = [r for r in rows if not r["y"]]
    bad = [r for r in rows if r["y"]]
    out = {
        "false_flags": rate(sum(r[key] == "error" for r in ok), len(ok)),
        "unsure": rate(sum(r[key] == "unsure" for r in rows), len(rows)),
        "ok_unsure": rate(sum(r[key] == "unsure" for r in ok), len(ok)),
        "catch": rate(sum(r[key] == "error" for r in bad), len(bad)),
        "catch_or_unsure": rate(sum(r[key] != "correct" for r in bad), len(bad)),
    }
    groups = {
        "gross": lambda r: r["mistake"] in GROSS,
        "subtle": lambda r: r["mistake"] in SUBTLE,
        "near": lambda r: r["mistake"] == "near",
        "subtle_audible": lambda r: (
            r["mistake"] in SUBTLE and (r["audible_mms"] or r["audible_prisma"])
        ),
        "subtle_audible_prisma": lambda r: r["mistake"] in SUBTLE and r["audible_prisma"],
        "subtle_audible_mms": lambda r: r["mistake"] in SUBTLE and r["audible_mms"],
    }
    for name, f in groups.items():
        rs = [r for r in bad if f(r)]
        out[name] = rate(sum(r[key] == "error" for r in rs), len(rs))
        out[name + "_or_unsure"] = rate(sum(r[key] != "correct" for r in rs), len(rs))
    return out


def passages(rows: list[dict], key: str) -> dict:
    by_clip: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_clip[r["clip"]].append(r)
    listen, wrong, placed, abs_err = 0, 0, 0, []
    for rs in by_clip.values():
        truth = 1 - sum(r["y"] for r in rs) / len(rs)
        d = passage([r[key] for r in rs])
        abs_err.append(abs((d.accuracy_low + d.accuracy_high) / 2 - truth))
        if d.needs_listen:
            listen += 1
        else:
            placed += 1
            wrong += d.band != band(truth)
    return {
        "clips": len(by_clip),
        "needs_listen": rate(listen, len(by_clip)),
        "misplaced": rate(wrong, placed),
        "accuracy_abs_error": float(np.mean(abs_err)) if abs_err else None,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--test", action="store_true", help="also score the test split")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")

    rows = load_rows()
    report: dict = {"features": FEATURES, "max_false_flags": MAX_FF, "max_unsure": MAX_UNSURE}
    models = {}
    for lang in LANGS:
        tune = [r for r in rows if r["lang"] == lang and r["split"] == "tune"]
        cal = [r for r in rows if r["lang"] == lang and r["split"] == "calibrate"]
        # rule table: the Phase 2 check threshold (tune, clean, 5% of correct words)
        t_check = threshold_at(
            [r["check_score"] for r in tune if r["cond"] == "clean" and not r["y"]], MAX_FF
        )
        model = fit_logistic(np.array([r["x"] for r in tune]), np.array([r["y"] for r in tune]), L2)
        s_cal = model.score(np.array([r["x"] for r in cal]))
        y_cal = np.array([r["y"] for r in cal])
        iso = fit_isotonic(s_cal, y_cal)
        th = choose_thresholds(iso(s_cal), y_cal, MAX_FF, MAX_UNSURE)
        models[lang] = (model, iso, th, t_check)
        report.setdefault("models", {})[lang] = {
            "weights": dict(zip(FEATURES, map(float, model.weights), strict=True)),
            "bias": model.bias,
            "check_threshold": t_check,
            "thresholds": {"error": th.error, "correct": th.correct},
            "train": {"words": len(tune), "mistakes": int(sum(r["y"] for r in tune))},
        }

    for r in rows:
        model, iso, th, t_check = models[r["lang"]]
        r["p"] = float(iso(model.score(r["x"]))[0])
        r["fused"] = state(r["p"], th)
        check = r["check_score"] < t_check
        r["prisma_s"] = "error" if r["prisma"] else "correct"
        r["check_s"] = "error" if check else "correct"
        r["rule"] = rule_state(r["prisma"], check)

    systems = ("prisma_s", "check_s", "rule", "fused")
    splits = ["calibrate"] + (["test"] if args.test else [])
    for split in splits:
        node = report.setdefault(split, {})
        for cond in (*CONDS, "all"):
            for lang in (*LANGS, "all"):
                rs = [
                    r
                    for r in rows
                    if r["split"] == split
                    and (cond == "all" or r["cond"] == cond)
                    and (lang == "all" or r["lang"] == lang)
                ]
                if not rs:
                    continue
                cell = node.setdefault(cond, {}).setdefault(lang, {})
                for sysname in systems:
                    cell[sysname] = {
                        "words": summary(rs, sysname),
                        "passages": passages(rs, sysname),
                    }
                cell["fused"]["ece"] = ece(
                    np.array([r["p"] for r in rs]), np.array([r["y"] for r in rs])
                )

    out = ROOT / "results" / ("fusion_report.json" if args.test else "fusion_report_dev.json")
    out.write_text(json.dumps(report, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    for lang, m in report["models"].items():
        w = {k: round(v, 2) for k, v in m["weights"].items()}
        print(
            lang,
            "train",
            m["train"],
            "thresholds",
            {k: round(v, 3) for k, v in m["thresholds"].items()},
        )
        print("   weights", w)
    for split in splits:
        for cond in ("clean", "all"):
            print(f"\n[{split} / {cond}]")
            for lang in (*LANGS, "all"):
                cell = report[split][cond].get(lang)
                if not cell:
                    continue
                print(f"  {lang}")
                for sysname in systems:
                    wd, ps = cell[sysname]["words"], cell[sysname]["passages"]
                    print(
                        f"    {sysname:8} catch {fmt(wd['catch'])}"
                        f"  +unsure {fmt(wd['catch_or_unsure'])}"
                        f"  ff {fmt(wd['false_flags'])}  unsure {fmt(wd['unsure'])}"
                    )
                    print(
                        f"             near {fmt(wd['near'])} / {fmt(wd['near_or_unsure'])}"
                        f"  subtle {fmt(wd['subtle'])} / {fmt(wd['subtle_or_unsure'])}"
                        f"  audible(prisma) {fmt(wd['subtle_audible_prisma'])}"
                        f"  gross {fmt(wd['gross'])}"
                    )
                    print(
                        f"             passages: listen {fmt(ps['needs_listen'])}"
                        f"  misplaced {fmt(ps['misplaced'])}"
                        f"  acc err {ps['accuracy_abs_error']:.3f}"
                    )
                print(f"    fused ECE {cell['fused']['ece']:.3f}")
    print(f"\nwrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
