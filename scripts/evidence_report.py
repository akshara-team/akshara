"""Score the per-word evidence on the benchmark and judge the Phase 2 predictions. No API calls.

    uv run python scripts/evidence_report.py

Reads results/evidence_mms.jsonl (from scripts/evidence_study.py) and Prisma's committed
transcripts, and writes results/evidence_report.json. Every number in the Phase 2 section of
docs/RESULTS.md comes from that file.

Rules, fixed in docs/PREDICTIONS.md before the run:
- thresholds per language, from correctly read words in the `tune` split only (clean audio), at
  5% false flags; the same threshold is then used for every audio condition
- results on `calibrate` + `test` pooled ("eval"), with 95% Wilson intervals
- planted mistakes never move a threshold
"""

import json
import sys
from collections import defaultdict
from functools import cache
from pathlib import Path

from akshara.core.align import score as prisma_score
from akshara.core.stats import wilson
from akshara.core.text import loose_key, words
from akshara.dataset import load
from akshara.evidence.scoring import heard_as_said, labels, threshold_at

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "data" / "bench" / "manifest-v1.jsonl"
EVIDENCE = ROOT / "results" / "evidence_mms.jsonl"
OUT = ROOT / "results" / "evidence_report.json"

MAX_FF = 0.05
EVAL = ("calibrate", "test")
LANGS = ("hi-IN", "kn-IN", "ta-IN")
GROSS = ("skip", "distant", "half", "first_guess", "reversal")
SUBTLE = ("near", "visual", "matra", "conjunct", "vowel_length")


@cache
def transcripts(path: str) -> dict[str, str]:
    data = json.loads((ROOT / path).read_text(encoding="utf-8"))
    return {p["id"]: p["transcript"] for p in data["passages"]}


def check_score(w: dict | None, *, spelling_aware: bool) -> float | None:
    """The per-word score. With `spelling_aware`, a free reading that is only a spelling
    variant of the story word (same loose key) does not count against it."""
    if w is None:
        return None
    if not spelling_aware:
        return w["score"]
    free = 0.0 if loose_key(w["free_text"]) == loose_key(w["word"]) else w["margin_free"]
    return free if w["margin_alt"] is None else min(free, w["margin_alt"])


def word_rows() -> list[dict]:
    ev = {}
    for line in EVIDENCE.read_text(encoding="utf-8").splitlines():
        r = json.loads(line)
        ev[r["clip_id"]] = r
    rows = []
    for c in load(MANIFEST):
        if c.clip_id not in ev:
            continue
        e = ev[c.clip_id]
        by_index = {w["index"]: w for w in e["words"]}
        ref = words(c.reference)
        text = transcripts(c.report).get(c.passage_id) if c.report else None
        prisma = set(prisma_score(c.reference, text, loose=True).flagged_indexes) if text else None
        mistakes, fluency = labels(c)
        said = {x["index"]: x.get("said") for x in c.errors}
        for i, word in enumerate(ref):
            w = by_index.get(i)
            rows.append(
                {
                    "clip": c.clip_id,
                    "lang": c.lang,
                    "set": c.set,
                    "split": "eval" if c.split in EVAL else c.split,
                    "cond": "+".join(c.conditions) or "clean",
                    "index": i,
                    "word": word,
                    "mistake": mistakes.get(i),
                    "fluency": fluency.get(i),
                    "said": said.get(i),
                    "aligned": e["aligned"],
                    "score": check_score(w, spelling_aware=True),
                    "score_raw": check_score(w, spelling_aware=False),
                    "free_text": w["free_text"] if w else None,
                    "gap": w["gap_before_s"] if w else None,
                    "gap_speech": w["gap_speech_s"] if w else None,
                    "prisma": None if prisma is None else i in prisma,
                }
            )
    return rows


def rate(k: int, n: int) -> dict:
    lo, hi = wilson(k, n)
    return {"k": k, "n": n, "rate": k / n if n else None, "lo": lo, "hi": hi}


def fmt(r: dict) -> str:
    if not r["n"]:
        return "—"
    return f"{r['k']}/{r['n']} ({r['rate']:.0%}, {r['lo']:.0%}–{r['hi']:.0%})"


def thresholds(rows: list[dict], key: str) -> dict[str, float]:
    out = {}
    for lang in LANGS:
        ok = [
            r[key]
            for r in rows
            if r["lang"] == lang
            and r["split"] == "tune"
            and r["cond"] == "clean"
            and r["mistake"] is None
            and r[key] is not None
        ]
        out[lang] = threshold_at(ok, MAX_FF)
    return out


def flags(r: dict, key: str, t: dict[str, float]) -> bool:
    return r[key] is not None and r[key] < t[r["lang"]]


def table(rows: list[dict], flag) -> dict:
    """Catch per mistake type and false flags, from any per-word flag function."""
    by_type: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    ff = [0, 0]
    for r in rows:
        f = flag(r)
        if r["mistake"]:
            by_type[r["mistake"]][0] += f
            by_type[r["mistake"]][1] += 1
        else:
            ff[0] += f
            ff[1] += 1
    out = {t: rate(k, n) for t, (k, n) in sorted(by_type.items())}
    for name, kinds in (("gross", GROSS), ("subtle", SUBTLE)):
        k = sum(by_type[t][0] for t in kinds if t in by_type)
        n = sum(by_type[t][1] for t in kinds if t in by_type)
        out[name] = rate(k, n)
    k = sum(v[0] for v in by_type.values())
    n = sum(v[1] for v in by_type.values())
    out["all_mistakes"] = rate(k, n)
    out["false_flags"] = rate(*ff)
    return out


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    rows = word_rows()
    with_prisma = [r for r in rows if r["prisma"] is not None]
    t = thresholds(rows, "score")
    t_raw = thresholds(rows, "score_raw")

    sources = {
        "prisma": lambda r: bool(r["prisma"]),
        "check": lambda r: flags(r, "score", t),
        "check_raw": lambda r: flags(r, "score_raw", t_raw),
        "either": lambda r: bool(r["prisma"]) or flags(r, "score", t),
    }

    def sel(split=None, cond=None, lang=None, sets=None):
        return [
            r
            for r in with_prisma
            if (split is None or r["split"] == split)
            and (cond is None or r["cond"] == cond)
            and (lang is None or r["lang"] == lang)
            and (sets is None or r["set"] in sets)
        ]

    results: dict = {"thresholds": t, "thresholds_raw": t_raw, "max_false_flags": MAX_FF}
    for split in ("eval", None):
        sk = split or "all"
        for cond in ("clean", "phone8k", "noise5", "child4"):
            for lang in (*LANGS, None):
                rs = sel(split, cond, lang)
                if not rs:
                    continue
                node = results.setdefault(sk, {}).setdefault(cond, {})
                node[lang or "all"] = {name: table(rs, f) for name, f in sources.items()}

    # --- predictions -------------------------------------------------------------------------
    p = {}
    ev_clean = results["eval"]["clean"]["all"]

    # 1. audibility: near-sound swaps Prisma wrote as the story word; does the model hear them?
    near_missed = [
        r
        for r in sel(None, "clean")
        if r["mistake"] == "near" and not r["prisma"] and r["free_text"] is not None and r["said"]
    ]
    heard = sum(heard_as_said(r["free_text"], r["word"], r["said"]) for r in near_missed)
    p["1_audibility"] = {"heard": rate(heard, len(near_missed)), "bar": ">= 30%; < 10% = voice"}
    by_type_heard = {}
    for kind in SUBTLE:
        rs = [
            r
            for r in sel(None, "clean")
            if r["mistake"] == kind and r["free_text"] is not None and r["said"]
        ]
        by_type_heard[kind] = rate(
            sum(heard_as_said(r["free_text"], r["word"], r["said"]) for r in rs), len(rs)
        )
    p["1_audibility"]["all_subtle_by_type_all_prisma"] = by_type_heard

    p["2_near_catch"] = {"check": ev_clean["check"]["near"], "bar": ">= 50%"}
    p["3_types"] = {
        k: ev_clean["check"].get(k) for k in ("visual", "matra", "conjunct", "vowel_length")
    }
    p["3_types"]["bar"] = ">= 60% each; vowel_length <= 40%"
    p["4_gross"] = {"check": ev_clean["check"]["gross"], "bar": ">= 85%"}
    p["5_either"] = {
        "near": ev_clean["either"]["near"],
        "false_flags": ev_clean["either"]["false_flags"],
        "bar": "near >= 55%, false flags <= 8%",
    }
    phone = results["eval"]["phone8k"]["all"]["check"]["near"]
    p["6_phone"] = {
        "clean": ev_clean["check"]["near"],
        "phone8k": phone,
        "drop_points": None
        if phone["rate"] is None
        else round(100 * (ev_clean["check"]["near"]["rate"] - phone["rate"]), 1),
        "bar": "drop >= 15 points",
    }

    # 7. alignment: the longest gap sits right before the word a pause was planted before
    by_clip: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_clip[r["clip"]].append(r)
    hits, n_hes = 0, 0
    for rs in by_clip.values():
        target = [r["index"] for r in rs if r["fluency"] == "hesitation"]
        if not target or rs[0]["cond"] != "clean":
            continue
        n_hes += 1
        gaps = [r for r in rs if r["gap"] is not None and r["index"] > 0]
        if gaps and max(gaps, key=lambda r: r["gap"])["index"] == target[0]:
            hits += 1
    p["7_alignment"] = {"longest_gap_at_pause": rate(hits, n_hes), "bar": ">= 13 of 15"}
    p["8_tamil_weakest"] = {
        lang: results["eval"]["clean"][lang]["check"]["all_mistakes"] for lang in LANGS
    }
    results["predictions"] = p

    # --- A3: pauses and sounding out, from timings alone ----------------------------------------
    def silent(r):
        return None if r["gap"] is None else r["gap"] - r["gap_speech"]

    plain = [
        r
        for r in rows
        if r["split"] == "tune"
        and r["cond"] == "clean"
        and r["index"] > 0
        and r["mistake"] is None
        and r["fluency"] is None
        and r["gap"] is not None
    ]
    timing = {}
    for name, feat in (("silence_before", silent), ("speech_before", lambda r: r["gap_speech"])):
        cut = {}
        for lang in LANGS:
            vals = [-feat(r) for r in plain if r["lang"] == lang]
            cut[lang] = -threshold_at(vals, MAX_FF)  # flag when feature > cut

        def flag(r, feat=feat, cut=cut):
            v = feat(r) if r["gap"] is not None and r["index"] > 0 else None
            return v is not None and v > cut[r["lang"]]

        found = {}
        for kind in ("hesitation", "decode", "repeat", "selfcorrect"):
            rs = [
                r
                for r in rows
                if r["fluency"] == kind and r["split"] == "eval" and r["cond"] == "clean"
            ]
            found[kind] = rate(sum(flag(r) for r in rs), len(rs))
        rs = [
            r
            for r in rows
            if r["split"] == "eval"
            and r["cond"] == "clean"
            and r["index"] > 0
            and r["mistake"] is None
            and r["fluency"] is None
        ]
        found["false_flags"] = rate(sum(flag(r) for r in rs), len(rs))
        timing[name] = {"cut_s": cut, "found": found}
    results["timing"] = timing
    results["coverage"] = {
        "clips": len(by_clip),
        "not_aligned": sum(1 for rs in by_clip.values() if not rs[0]["aligned"]),
        "words": len(rows),
        "words_without_evidence": sum(r["score"] is None for r in rows),
    }

    OUT.write_text(json.dumps(results, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # --- print --------------------------------------------------------------------------------
    print("thresholds (tune, clean, 5% false flags):", {k: round(v, 3) for k, v in t.items()})
    print("coverage:", results["coverage"])
    for cond in ("clean", "phone8k", "noise5", "child4"):
        print(f"\n[eval / {cond}]")
        for lang in (*LANGS, "all"):
            node = results["eval"][cond].get(lang)
            if not node:
                continue
            print(f"  {lang}")
            for name in ("prisma", "check", "either"):
                tb = node[name]
                kinds = "  ".join(f"{k} {fmt(tb[k])}" for k in (*GROSS, *SUBTLE) if k in tb)
                print(
                    f"    {name:7} mistakes {fmt(tb['all_mistakes'])}  "
                    f"false flags {fmt(tb['false_flags'])}"
                )
                print(f"            {kinds}")
    print("\npredictions")
    for k, v in p.items():
        print(" ", k, json.dumps(v, ensure_ascii=False, default=str)[:400])
    print("\ntiming")
    for k, v in timing.items():
        print(
            " ",
            k,
            {kk: round(x, 2) for kk, x in v["cut_s"].items()},
            {kk: fmt(x) for kk, x in v["found"].items()},
        )
    print(f"\nwrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
