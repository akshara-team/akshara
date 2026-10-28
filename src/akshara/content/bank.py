"""The practice-sentence bank the app picks from: Evon's sentences (shown to a child only once a
teacher approves them) and sentences cut from the published stories (usable straight away).

Evon's file is checked again on load, so a hand-edited or stale row that no longer passes the
checks never reaches a child. Pure apart from reading that one file.
"""

import json
from pathlib import Path

from akshara.content import sentences as S
from akshara.learner.bkt import Learner
from akshara.learner.skills import Curriculum
from akshara.learner.tutor import LEARNED, Library, skill_summary

SENTENCES = Path(__file__).resolve().parents[3] / "data" / "practice" / "sentences.jsonl"
PRACTISED = ("letter:", "vowel:", "sign:", "mark:", "conjunct:")  # not word length


def practised(text: str, cur: Curriculum) -> list[str]:
    """The skills a sentence gives practice in, in teaching order."""
    found: list[str] = []
    for w in S.words(text):
        found += [s for s in cur.skills_of(w) if s.startswith(PRACTISED) and s not in found]
    return sorted(found, key=cur.position)


def load(lib: Library, path: Path = SENTENCES) -> list[dict]:
    """Every usable sentence for one language: Evon's that still pass, then the stories'."""
    cur, rows = lib.curriculum, []
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            r = json.loads(line) if line.strip() else None
            if (
                not r
                or r.get("lang") != lib.lang
                or r.get("skill") not in {s.id for s in cur.skills}
            ):
                continue
            if S.problems(r["text"], S.Target(lib.lang, r["skill"], ()), cur):
                continue
            rows.append({**r, "skills": practised(r["text"], cur)})
    seen = {r["text"] for r in rows}
    for text in S.story_sentences(list(lib.texts)):
        if text in seen:
            continue
        seen.add(text)
        rows.append({
            "id": S.sentence_id(lib.lang, text), "lang": lib.lang, "skill": None, "text": text,
            "source": "story", "skills": practised(text, cur),
        })  # fmt: skip
    return rows


def targets_for(learner: Learner, cur: Curriculum, n: int = 3) -> list[str]:
    """What the child should practise: the skills they are working on, else the next ones."""
    weak = [s["id"] for s in skill_summary(learner, cur, n)["working_on"]]
    if weak:
        return weak
    upcoming = [
        s.id for s in cur.skills if s.id.startswith(PRACTISED) and learner.p(s.id) < LEARNED
    ]
    return upcoming[:n]


def pick(
    rows: list[dict],
    cur: Curriculum,
    targets: list[str],
    approved: set[str],
    reads: dict[str, int],
) -> tuple[dict, str] | None:
    """The sentence for the first target that has one, and that target. Approved Evon
    sentences written for the target come first, then any approved one that uses it, then a
    story sentence that passes the same checks. Least read by this child wins; ties by id."""
    for skill in targets:
        t = S.Target(cur.lang, skill, ())

        def usable(r: dict, skill: str = skill, t: S.Target = t) -> bool:
            if r["source"] == "evon" and r["id"] not in approved:
                return False
            return skill in r["skills"] and not S.problems(r["text"], t, cur)

        ranked = sorted(
            (r for r in rows if usable(r)),
            key=lambda r: (
                reads.get(r["id"], 0),
                0 if r["source"] == "evon" and r["skill"] == skill else 1,
                0 if r["source"] == "evon" else 1,
                r["id"],
            ),
        )
        if ranked:
            return ranked[0], skill
    return None
