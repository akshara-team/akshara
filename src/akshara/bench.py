"""Score benchmark clips against what was planted, and roll the results up.

Works with any transcript source: the planted text itself (a dry run, which must score
perfectly), committed study reports, or a live provider later. The rules per mistake type come
from `core.plant.TAXONOMY`:

- word mistakes (`should_flag`) are "caught" when the scorer flags that story word
- fluency events are "kept" when the transcript still shows the extra speech beside the word;
  a hesitation is silence, so text alone cannot show it ("unmeasured" until word timings exist)
- a false flag is a flagged story word with no planted word mistake
"""

from collections import defaultdict

from akshara.core.align import insertion_near, score
from akshara.core.plant import TAXONOMY
from akshara.dataset import Clip


def evaluate(clip: Clip, transcript: str, *, loose: bool = True) -> dict:
    s = score(clip.reference, transcript, loose=loose)
    flagged = set(s.flagged_indexes)
    planted = {e["index"] for e in clip.errors if TAXONOMY[e["type"]].should_flag}
    errors = []
    for e in clip.errors:
        kind = TAXONOMY[e["type"]]
        row = {"type": e["type"], "index": e["index"]}
        if kind.should_flag:
            row["caught"] = e["index"] in flagged
        elif e["type"] == "hesitation":
            row["kept"] = None
        else:
            row["kept"] = insertion_near(s.marks, e["index"])
        errors.append(row)
    return {
        "clip_id": clip.clip_id,
        "lang": clip.lang,
        "set": clip.set,
        "split": clip.split,
        "condition": "+".join(clip.conditions) or "clean",
        "errors": errors,
        "ok_words": s.total_words - len(planted),
        "false_flags": sorted(flagged - planted),
    }


def summarise(results: list[dict], by: tuple[str, ...] = ("condition", "lang")) -> dict:
    """Nested totals keyed by the `by` fields, with per-type counts and rates."""
    groups: dict[tuple, list[dict]] = defaultdict(list)
    for r in results:
        groups[tuple(r[k] for k in by)].append(r)
    out: dict = {}
    for key, rows in sorted(groups.items()):
        word: dict[str, list[int]] = defaultdict(lambda: [0, 0])
        fluency: dict[str, list[int]] = defaultdict(lambda: [0, 0, 0])
        for r in rows:
            for e in r["errors"]:
                if "caught" in e:
                    word[e["type"]][0] += 1
                    word[e["type"]][1] += e["caught"]
                else:
                    f = fluency[e["type"]]
                    f[0] += 1
                    if e["kept"] is None:
                        f[2] += 1
                    else:
                        f[1] += e["kept"]
        planted = sum(n for n, _ in word.values())
        caught = sum(c for _, c in word.values())
        ok = sum(r["ok_words"] for r in rows)
        ff = sum(len(r["false_flags"]) for r in rows)
        node = out
        for k in key[:-1]:
            node = node.setdefault(k, {})
        node[key[-1]] = {
            "clips": len(rows),
            "planted": planted,
            "caught": caught,
            "catch_rate": caught / planted if planted else None,
            "ok_words": ok,
            "false_flags": ff,
            "false_flag_rate": ff / ok if ok else None,
            "by_type": {t: {"planted": n, "caught": c} for t, (n, c) in sorted(word.items())},
            "fluency": {
                t: {"planted": n, "kept": k, "unmeasured": u}
                for t, (n, k, u) in sorted(fluency.items())
            },
        }
    return out
