"""Simulated learners: children with known skills, to test placement and tracking without children.

A simulated child knows a set of skills: mostly the first K in teaching order, with a few gaps
and a few skills known early. Reading a word:
- every skill in it known: right with chance 1 - `SLIP`
- otherwise: right with chance `GUESS` per unknown skill (multiplied)

Each true result then goes through a **scoring channel**: the chance that the scorer says
`correct`, `unsure` or `error` for a word read right or wrong. The channels come from measured
numbers (Phase 3, `results/fusion_report.json`), so placement is tested with the scorer's real
error rates, not a perfect one.

This tests the learner model against its own assumptions: the simulated child follows the same
skill model that BKT and placement assume. It shows the machinery works and how much scoring
noise costs. It cannot show that real children learn this way (docs/PRODUCT_PLAN.md section 6
says so too).

Deterministic given the random generator passed in.
"""

from dataclasses import dataclass

import numpy as np

from akshara.learner.placement import ITEM_PASS, Placement
from akshara.learner.skills import Curriculum

SLIP = 0.05
GUESS = 0.2
HOLE = 0.1  # chance a skill inside the known range is not known
EARLY = 0.05  # chance a skill past the known range is known anyway
LEARN = 0.03  # chance an unknown skill becomes known each time it is practised

# P(scorer state | word read right) and P(state | word read wrong), as (correct, unsure, error)
Channel = dict[bool, tuple[float, float, float]]
PERFECT: Channel = {True: (1.0, 0.0, 0.0), False: (0.0, 0.0, 1.0)}
STATES = ("correct", "unsure", "error")


@dataclass
class Child:
    known: set[str]

    def p_correct(self, skills: list[str]) -> float:
        unknown = sum(s not in self.known for s in skills)
        return 1 - SLIP if unknown == 0 else GUESS**unknown

    def read(self, skills: list[str], rng: np.random.Generator) -> bool:
        return bool(rng.random() < self.p_correct(skills))

    def practise(self, skills: list[str], rng: np.random.Generator) -> None:
        for s in skills:
            if s not in self.known and rng.random() < LEARN:
                self.known.add(s)


def make_child(cur: Curriculum, k: int, rng: np.random.Generator) -> Child:
    known = set()
    for i, s in enumerate(cur.skills):
        if (i < k and rng.random() >= HOLE) or (i >= k and rng.random() < EARLY):
            known.add(s.id)
    return Child(known)


def observe(right: bool, channel: Channel, rng: np.random.Generator) -> str:
    return STATES[int(rng.choice(3, p=np.array(channel[right])))]


@dataclass(frozen=True)
class Pools:
    """What placement can show, per task: each item is a list of words, each word its skills."""

    items: dict[str, list[list[list[str]]]]


def true_level(child: Child, pools: Pools) -> str:
    """The level the child would get from a perfect scorer and unlimited items: a task is passed
    when the child's expected accuracy over the whole pool meets the pass rule."""

    def ok(task: str) -> bool:
        ps = [child.p_correct(w) for item in pools.items[task] for w in item]
        return float(np.mean(ps)) >= ITEM_PASS[task]

    if ok("paragraph"):
        return "story" if ok("story") else "paragraph"
    if ok("words"):
        return "word"
    return "letter" if ok("letters") else "beginner"


def place(child: Child, pools: Pools, channel: Channel, rng: np.random.Generator) -> Placement:
    pl = Placement()
    used: dict[str, set[int]] = {}
    while not pl.done:
        task = pl.task
        assert task is not None
        pool = pools.items[task]
        free = [i for i in range(len(pool)) if i not in used.setdefault(task, set())]
        i = int(rng.choice(free)) if free else int(rng.integers(len(pool)))
        used[task].add(i)
        pl.record([observe(child.read(w, rng), channel, rng) for w in pool[i]])
    return pl
