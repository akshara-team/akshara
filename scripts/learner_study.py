"""Phase 4: test the learner model on simulated children. No API calls, no credits.

    uv run python scripts/learner_study.py --smoke   # runs a few children, prints no numbers
    uv run python scripts/learner_study.py           # the study (predictions: PREDICTIONS.md)

Three parts, all on the passage bank (data/open_passages/candidates.jsonl, 413 StoryWeaver
passages with their level):
1. Passage difficulty from text against StoryWeaver's level 1 / level 2 tag.
2. Placement: simulated children, true level against placed level, with a perfect scorer, Prisma
   alone and the fused scorer (error rates measured in Phase 3, results/fusion_report.json).
3. Tracking: simulated children practise words, BKT tracks them; how well the final estimates
   separate known from unknown skills, and four ways of using `unsure`.

Writes results/learner_study.json. Seeds are fixed, so a re-run gives the same numbers.
"""

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np

from akshara.core.difficulty import profiles
from akshara.core.stats import auc, wilson
from akshara.core.text import words
from akshara.learner.bkt import Learner
from akshara.learner.placement import LEVELS
from akshara.learner.simulate import PERFECT, Channel, Pools, make_child, observe, place, true_level
from akshara.learner.skills import build

ROOT = Path(__file__).resolve().parent.parent
BANK = ROOT / "data" / "open_passages" / "candidates.jsonl"
FUSION = ROOT / "results" / "fusion_report.json"
OUT = ROOT / "results" / "learner_study.json"
LANGS = ("hi-IN", "kn-IN", "ta-IN")
SEED = 20261025
N_PLACE = 2000
N_TRACK = 400
PRACTICE_WORDS = 150
MIN_SEEN = 3
ITEMS_PER_POOL = 20
UNSURE_MODES = ("weak", "as_correct", "as_error", "ignore")


def channels(lang: str) -> dict[str, Channel]:
    w = json.loads(FUSION.read_text(encoding="utf-8"))["test"]["all"][lang]

    def rate(node: dict, key: str) -> float:
        return node[key]["rate"]

    out: dict[str, Channel] = {"perfect": PERFECT}
    p = w["prisma_s"]["words"]
    out["prisma"] = {
        True: (1 - rate(p, "false_flags"), 0.0, rate(p, "false_flags")),
        False: (1 - rate(p, "catch"), 0.0, rate(p, "catch")),
    }
    for name in ("fused", "guarded"):  # guarded last, so earlier channels keep their seeds
        f = w[name]["words"]
        ok_err, ok_uns = rate(f, "false_flags"), rate(f, "ok_unsure")
        bad_err = rate(f, "catch")
        bad_uns = rate(f, "catch_or_unsure") - bad_err
        out[name] = {
            True: (1 - ok_err - ok_uns, ok_uns, ok_err),
            False: (1 - bad_err - bad_uns, bad_uns, bad_err),
        }
    return out


def pools(cur, bank_words: Counter, texts: list[str], scores: list[float], rng) -> Pools:
    """Item pools for the four placement tasks, built once per language."""
    letters = [s.id for s in cur.skills if s.kind in ("letter", "vowel")][:20]
    simple = [
        w
        for w, _ in bank_words.most_common()
        if all(
            cur.skills[cur.position(s)].stage in ("core letters", "vowel signs", "short words")
            for s in cur.skills_of(w)
        )
    ][:100]
    order = np.argsort(scores)
    third = max(len(order) // 3, 1)
    easy = [texts[i] for i in order[:third]]
    hard = [texts[i] for i in order[-third:]]

    def passage(t: str) -> list[list[str]]:
        return [cur.skills_of(w) for w in words(t)]

    return Pools(
        {
            "letters": [
                [[s] for s in rng.choice(letters, 5, replace=False)] for _ in range(ITEMS_PER_POOL)
            ],
            "words": [
                [cur.skills_of(w) for w in rng.choice(simple, 5, replace=False)]
                for _ in range(ITEMS_PER_POOL)
            ],
            "paragraph": [passage(t) for t in easy],
            "story": [passage(t) for t in hard],
        }
    )


def rate(k: int, n: int) -> dict:
    lo, hi = wilson(k, n)
    return {"k": k, "n": n, "rate": k / n if n else None, "lo": lo, "hi": hi}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--smoke", action="store_true", help="a few children, no numbers printed")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    n_place, n_track = (5, 3) if args.smoke else (N_PLACE, N_TRACK)

    bank = [json.loads(x) for x in BANK.read_text(encoding="utf-8").splitlines() if x]
    report: dict = {"seed": SEED, "children_placed": n_place, "children_tracked": n_track}
    for li, lang in enumerate(LANGS):
        rows = [r for r in bank if r["lang"] == lang]
        texts = [r["reference"] for r in rows]
        cur = build(texts, lang)
        prof = profiles(texts, lang)
        scores = [p.score for p in prof]
        node: dict = {"skills": len(cur.skills), "passages": len(rows)}

        # 1. difficulty against StoryWeaver's level tag
        lv1 = [p.score for p, r in zip(prof, rows, strict=True) if r["level"] == "1"]
        lv2 = [p.score for p, r in zip(prof, rows, strict=True) if r["level"] == "2"]
        node["difficulty"] = {
            "auc_level2_harder": auc(lv2, lv1),
            "n_l1": len(lv1),
            "n_l2": len(lv2),
        }
        per_feature = {}
        for f in prof[0].features:
            a = [p.features[f] for p, r in zip(prof, rows, strict=True) if r["level"] == "2"]
            b = [p.features[f] for p, r in zip(prof, rows, strict=True) if r["level"] == "1"]
            per_feature[f] = auc(a, b)
        node["difficulty"]["auc_by_feature"] = per_feature

        # 2. placement
        bank_words: Counter = Counter(w for t in texts for w in words(t))
        pl_pools = pools(cur, bank_words, texts, scores, np.random.default_rng([SEED, li, 0]))
        chans = channels(lang)
        place_out: dict = {}
        truths = []
        for i in range(n_place):
            rng = np.random.default_rng([SEED, li, 1, i])
            k = int(rng.integers(0, len(cur.skills) + 1))
            truths.append((k, make_child(cur, k, rng)))
        levels = Counter(true_level(c, pl_pools) for _, c in truths)
        node["true_levels"] = {lv: levels.get(lv, 0) for lv in LEVELS}
        for ci, (cname, chan) in enumerate(chans.items()):
            exact = near = items = unsure = 0
            confusion: Counter = Counter()
            # guarded reuses fused's random draws, so the two are compared on the same readings
            seed = list(chans).index("fused") if cname == "guarded" else ci
            for i, (_, child) in enumerate(truths):
                rng = np.random.default_rng([SEED, li, 2, seed, i])
                pl = place(child, pl_pools, chan, rng)
                t = true_level(child, pl_pools)
                d = abs(LEVELS.index(pl.level) - LEVELS.index(t))
                exact += d == 0
                near += d <= 1
                items += pl.items
                unsure += pl.uncertain
                confusion[f"{t}->{pl.level}"] += 1
            place_out[cname] = {
                "exact": rate(exact, n_place),
                "within_one": rate(near, n_place),
                "mean_items": items / n_place,
                "uncertain": rate(unsure, n_place),
                "confusion": dict(sorted(confusion.items())),
            }
        node["placement"] = place_out

        # 3. tracking
        vocab = list(bank_words)
        weights = np.array([bank_words[w] for w in vocab], dtype=float)
        weights /= weights.sum()
        track: dict = {}
        for mode in (*UNSURE_MODES, "perfect"):
            pos, neg = [], []
            for i in range(n_track):
                rng = np.random.default_rng([SEED, li, 3, i])  # same children and words per mode
                k = int(rng.integers(0, len(cur.skills) + 1))
                child = make_child(cur, k, rng)
                learner = Learner()
                chan = PERFECT if mode == "perfect" else chans["fused"]
                for w in rng.choice(vocab, PRACTICE_WORDS, p=weights):
                    skills = cur.skills_of(w)
                    state = observe(child.read(skills, rng), chan, rng)
                    child.practise(skills, rng)
                    if state == "unsure" and mode != "weak":
                        if mode == "ignore":
                            continue
                        state = "correct" if mode == "as_correct" else "error"
                    learner.observe(skills, state)
                for s, n in learner.seen.items():
                    if n >= MIN_SEEN:
                        (pos if s in child.known else neg).append(learner.p(s))
            track[mode] = {"auc": auc(pos, neg), "known": len(pos), "unknown": len(neg)}
        node["tracking"] = track
        report[lang] = node

    if args.smoke:
        print("smoke run finished; no numbers printed")
        return
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    for lang in LANGS:
        n = report[lang]
        d = n["difficulty"]
        print(f"{lang}: {n['skills']} skills, {n['passages']} passages")
        print(
            f"  difficulty AUC (L2 harder) {d['auc_level2_harder']:.3f}  by feature",
            {k: round(v, 3) for k, v in d["auc_by_feature"].items()},
        )
        print("  true levels", n["true_levels"])
        for cname, p in n["placement"].items():
            print(
                f"  placement {cname:8} exact {p['exact']['rate']:.1%}  within one "
                f"{p['within_one']['rate']:.1%}  items {p['mean_items']:.2f}  "
                f"uncertain {p['uncertain']['rate']:.1%}"
            )
        for mode, t in n["tracking"].items():
            print(
                f"  tracking {mode:10} AUC {t['auc']:.3f}  ({t['known']} known, "
                f"{t['unknown']} unknown skill estimates)"
            )
    print(f"\nwrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
