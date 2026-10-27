"""The learner model inside the app: placement items, mastery updates and the next passage.

This joins the Phase 4 pieces (`placement.py`, `bkt.py`, `skills.py`, `core/difficulty.py`) to
the passage bank. Pure and deterministic: the same bank, child state and seed give the same
answer. Storage and HTTP are the caller's job.

Placement items, per task (as in `scripts/learner_study.py`, the study that tested them):
- letters: 5 of the 20 commonest letters, read as one row
- words: 5 common words made only of early skills (core letters, vowel signs, short words)
- paragraph: a whole easy passage (lowest third by difficulty)
- story: a whole hard passage (highest third)
The bank's passages are book blurbs of 5 to 30 words, shorter than ASER's paragraph (4
sentences) and story (8 to 10), so a pass here is weaker evidence than on the paper test.

Next passage: a difficulty band from the placement level, moved up after two strong readings
and down after two weak ones; inside the band, the passage with the most words that practise a
weak skill, skipping the last three passages read.
"""

import random
from collections import Counter
from dataclasses import dataclass

from akshara.core.aksharas import split
from akshara.core.difficulty import profiles
from akshara.core.text import words
from akshara.learner.bkt import Learner, Params
from akshara.learner.placement import Placement
from akshara.learner.skills import Curriculum, build

LETTERS_SHOWN, WORDS_SHOWN = 5, 5
EARLY_STAGES = ("core letters", "vowel signs", "short words")
# Share of the language's passages, easiest first, that suits each level.
LEVEL_BAND = {
    "beginner": (0.0, 0.25),
    "letter": (0.0, 0.25),
    "word": (0.0, 0.4),
    "paragraph": (0.25, 0.7),
    "story": (0.55, 1.0),
}
DEFAULT_LEVEL = "paragraph"  # before any placement: the middle, as ASER starts there
BAND_STEP = 0.15
STRONG, WEAK = 0.9, 0.7  # accuracy of the last two readings that moves the band
WEAK_SKILL = 0.6  # mastery below this, once seen twice, counts as "working on"
LEARNED = 0.95
# Mastery passes 0.95 after three correct words; a teacher reads "learned" as a fact, so it also
# needs this many sightings (a placement alone shows a skill once or twice).
LEARNED_MIN_SEEN = 4
WORD_AKSHARAS = (2, 4)  # ASER's word task: short everyday words, not suffixes or long words
RECENT = 3


@dataclass(frozen=True)
class Library:
    """One language's passages with what the tutor needs to know about them."""

    lang: str
    ids: tuple[str, ...]
    texts: tuple[str, ...]
    rank: dict[str, float]  # 0 = easiest passage, 1 = hardest
    curriculum: Curriculum
    simple_words: tuple[str, ...]
    letters: tuple[str, ...]


def library(bank: dict[str, dict], lang: str) -> Library | None:
    rows = sorted((p for p in bank.values() if p["lang"] == lang), key=lambda p: p["id"])
    if not rows:
        return None
    ids = tuple(p["id"] for p in rows)
    texts = tuple(p["reference"] for p in rows)
    scores = [pr.score for pr in profiles(list(texts), lang)] if len(rows) > 1 else [0.0]
    order = sorted(range(len(ids)), key=lambda i: (scores[i], ids[i]))
    rank = {ids[i]: (k / (len(ids) - 1) if len(ids) > 1 else 0.5) for k, i in enumerate(order)}
    cur = build(texts, lang)
    stage = {s.id: s.stage for s in cur.skills}
    freq: Counter[str] = Counter(w for t in texts for w in words(t))
    lo, hi = WORD_AKSHARAS
    simple = tuple(
        w
        for w, _ in freq.most_common()
        if lo <= len(split(w, lang)) <= hi
        and all(stage.get(s) in EARLY_STAGES for s in cur.skills_of(w))
    )[:100]
    letters = tuple(s.text for s in cur.skills if s.kind in ("letter", "vowel"))[:20]
    return Library(lang, ids, texts, rank, cur, simple, letters)


def placement_item(lib: Library, task: str, seed: int) -> dict:
    """What to show for one placement item: the text read aloud and its words in order."""
    rng = random.Random(f"{lib.lang}:{task}:{seed}")
    if task == "letters":
        shown = rng.sample(lib.letters, min(LETTERS_SHOWN, len(lib.letters)))
        return {"task": task, "text": "  ".join(shown), "words": shown, "passage_id": None}
    if task == "words":
        shown = rng.sample(lib.simple_words, min(WORDS_SHOWN, len(lib.simple_words)))
        return {"task": task, "text": "  ".join(shown), "words": shown, "passage_id": None}
    by_rank = sorted(lib.ids, key=lambda i: lib.rank[i])
    third = max(len(by_rank) // 3, 1)
    pool = by_rank[:third] if task == "paragraph" else by_rank[-third:]
    pid = rng.choice(pool)
    text = lib.texts[lib.ids.index(pid)]
    return {"task": task, "text": text, "words": words(text), "passage_id": pid}


def states(trace: list[dict]) -> list[str]:
    """Scorer marks to placement states, one per reference word (insertions dropped)."""
    out = []
    for w in trace:
        if w["op"] == "inserted":
            continue
        if w["op"] == "correct":
            out.append("unsure" if w.get("check") else "correct")
        else:
            out.append("error")
    return out


def replay(answers: list[list[str]]) -> Placement:
    """The placement after these confirmed items, in order."""
    p = Placement()
    for a in answers:
        p.record(a)
    return p


def observe_words(
    learner: Learner, cur: Curriculum, results: list[tuple[str, str]], teacher: bool = False
) -> None:
    """Update mastery from (word, state) pairs, state being correct / error / unsure."""
    for word, state in results:
        learner.observe(cur.skills_of(word), state, teacher=teacher)


def learner_from(rows: list[dict]) -> Learner:
    return Learner(
        Params(),
        {r["skill"]: r["p"] for r in rows},
        {r["skill"]: r["seen"] for r in rows},
    )


def skill_summary(learner: Learner, cur: Curriculum, n: int = 3) -> dict:
    """The few skills to work on (weakest, seen at least twice) and the ones learned."""
    order = {s.id: i for i, s in enumerate(cur.skills)}

    def item(s: str) -> dict:
        kind, text = s.split(":", 1)
        return {"id": s, "kind": kind, "text": text, "p": round(learner.p(s), 3)}

    seen = [s for s, k in learner.seen.items() if k >= 2 and s in order]
    weak = sorted(
        (s for s in seen if learner.p(s) < WEAK_SKILL), key=lambda s: (learner.p(s), order[s])
    )
    learned = sorted(
        (
            s
            for s in learner.known(LEARNED)
            if s in order and learner.seen.get(s, 0) >= LEARNED_MIN_SEEN
        ),
        key=order.__getitem__,
    )
    return {"working_on": [item(s) for s in weak[:n]], "learned": [item(s) for s in learned]}


def band(level: str | None, recent_accuracy: list[float]) -> tuple[float, float]:
    lo, hi = LEVEL_BAND.get(level or DEFAULT_LEVEL, LEVEL_BAND[DEFAULT_LEVEL])
    last = recent_accuracy[:2]
    if len(last) == 2 and min(last) >= STRONG:
        lo, hi = lo + BAND_STEP, hi + BAND_STEP
    elif len(last) == 2 and max(last) < WEAK:
        lo, hi = lo - BAND_STEP, hi - BAND_STEP
    return max(0.0, lo), min(1.0, hi)


def next_passage(
    lib: Library,
    learner: Learner,
    level: str | None,
    recent_ids: list[str],
    recent_accuracy: list[float],
) -> dict:
    """Pick the next passage. `recent_*` are newest first. Returns the id and why."""
    lo, hi = band(level, recent_accuracy)
    centre = (lo + hi) / 2
    skip = set(recent_ids[:RECENT])
    inside = [i for i in lib.ids if lo - 1e-9 <= lib.rank[i] <= hi + 1e-9 and i not in skip]
    if not inside:  # band too narrow or all read lately: nearest unread passages
        inside = sorted(
            (i for i in lib.ids if i not in skip) or lib.ids,
            key=lambda i: abs(lib.rank[i] - centre),
        )[:5]
    weak = {s for s, k in learner.seen.items() if k >= 2 and learner.p(s) < WEAK_SKILL}

    def practice(pid: str) -> float:
        ws = words(lib.texts[lib.ids.index(pid)])
        return sum(bool(weak & set(lib.curriculum.skills_of(w))) for w in ws) / max(len(ws), 1)

    best = max(inside, key=lambda i: (practice(i), -abs(lib.rank[i] - centre), i))
    share = practice(best)
    reason = (
        f"practises {', '.join(sorted(s.split(':', 1)[1] for s in weak)[:3])}"
        if weak and share > 0
        else "at the child's level"
    )
    return {"passage_id": best, "rank": lib.rank[best], "band": [lo, hi], "reason": reason}
