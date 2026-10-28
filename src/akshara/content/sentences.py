"""Practice sentences for one skill: what to ask Evon for, and the checks every sentence must pass.

A child weak on a skill (a letter, a vowel sign, a conjunct) reads one short sentence that uses
it. Evon writes candidates offline (`scripts/evon_sentences.py`); a teacher approves each one
before any child sees it. Evon follows instructions poorly (IndicIFEval 47), so it is asked for
one small JSON object and everything it returns is checked here, by code:

- only the language's own script, and a few punctuation marks
- 3 to 8 words, at most 60 characters (Timbre's limit for one clip)
- uses the target skill in at least one word
- every word decodable at the target's place in the curriculum: any letter and vowel sign, words
  up to 4 aksharas, and marks, conjuncts and long words only once the target has reached them
- no sound the curriculum has never seen, no word on the blocklist, no repeats

Pure: no network, no model calls. Fallback sentences come from the story bank, which is
published text, so a child always has something to read.
"""

import hashlib
import json
import re
from dataclasses import dataclass

from akshara.core.text import words
from akshara.learner.skills import Curriculum

LANGUAGE_NAMES = {"hi-IN": "Hindi", "kn-IN": "Kannada", "ta-IN": "Tamil"}
SCRIPT_RANGES = {"hi-IN": (0x0900, 0x097F), "kn-IN": (0x0C80, 0x0CFF), "ta-IN": (0x0B80, 0x0BFF)}
PUNCTUATION = set(" .,!?।॥'\"-‌‍")
MIN_WORDS, MAX_WORDS, MAX_CHARS = 3, 8, 60
# Skills a practice sentence may always use: every letter and vowel sign, short and medium
# words. Marks, conjuncts and long words only when the target is at or past them.
ALWAYS = ("letter:", "vowel:", "sign:", "length:short", "length:medium")


@dataclass(frozen=True)
class Target:
    lang: str
    skill: str
    examples: tuple[str, ...]  # words from the bank that use the skill, for the prompt


def sentence_id(lang: str, text: str) -> str:
    return hashlib.sha256(f"{lang}|{text.strip()}".encode()).hexdigest()[:16]


def allowed(cur: Curriculum, skill: str) -> set[str]:
    upto = cur.position(skill)
    return {s.id for i, s in enumerate(cur.skills) if i <= upto or s.id.startswith(ALWAYS)}


def examples(cur: Curriculum, skill: str, texts: list[str], n: int = 4) -> tuple[str, ...]:
    """Common bank words that use the skill and pass the decodability check."""
    ok = allowed(cur, skill)
    seen: dict[str, int] = {}
    for t in texts:
        for w in words(t):
            if skill in cur.skills_of(w) and set(cur.skills_of(w)) <= ok and not cur.unknown(w):
                seen[w] = seen.get(w, 0) + 1
    return tuple(sorted(seen, key=lambda w: (-seen[w], len(w), w))[:n])


def prompt(target: Target) -> list[dict]:
    """Chat messages for Evon: short, one task, one JSON shape."""
    name = LANGUAGE_NAMES[target.lang]
    use = ", ".join(target.examples)
    return [
        {
            "role": "system",
            "content": f"You write very short, simple {name} sentences for young children "
            "learning to read. Reply with JSON only.",
        },
        {
            "role": "user",
            "content": f"Write 3 different sentences in {name} script for a 7-year-old. Each "
            f"sentence has {MIN_WORDS} to {MAX_WORDS - 2} simple words about everyday things: "
            f"home, school, animals, food, family. Each sentence uses at least one of these "
            f'words: {use}. Reply exactly like this: {{"sentences": ["...", "...", "..."]}}',
        },
    ]


def retry_message(problems: list[str]) -> dict:
    return {
        "role": "user",
        "content": "Some sentences were not usable: " + "; ".join(problems[:4]) + ". Write 3 "
        'new sentences. Reply with JSON only: {"sentences": ["...", "...", "..."]}',
    }


def parse(raw: str) -> list[str] | None:
    """The sentences in Evon's reply, or None when there is no usable JSON object."""
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    items = data.get("sentences") if isinstance(data, dict) else None
    if not isinstance(items, list):
        return None
    return [s.strip() for s in items if isinstance(s, str) and s.strip()]


def problems(
    text: str, target: Target, cur: Curriculum, blocklist: frozenset[str] = frozenset()
) -> list[str]:
    """Why a sentence cannot be shown to a child; empty when it passes every check."""
    out: list[str] = []
    lo, hi = SCRIPT_RANGES[target.lang]
    if any(not (lo <= ord(ch) <= hi) and ch not in PUNCTUATION for ch in text):
        out.append("uses letters from another script")
    ws = words(text)
    if not MIN_WORDS <= len(ws) <= MAX_WORDS:
        out.append(f"has {len(ws)} words, not {MIN_WORDS}-{MAX_WORDS}")
    if len(text) > MAX_CHARS:
        out.append(f"longer than {MAX_CHARS} characters")
    if out:
        return out  # the rest only makes sense for a short sentence in the right script
    if not any(target.skill in cur.skills_of(w) for w in ws):
        out.append("does not use the target sound")
    ok = allowed(cur, target.skill)
    hard = sorted({w for w in ws if cur.unknown(w) or not set(cur.skills_of(w)) <= ok})
    if hard:
        out.append("words too hard for this step: " + " ".join(hard[:3]))
    if blocklist & set(ws):
        out.append("uses a blocked word")
    if len(set(ws)) < len(ws) - 1:
        out.append("repeats words")
    return out


def story_sentences(texts: list[str]) -> list[str]:
    """Sentences cut from published stories, for when no approved Evon sentence fits."""
    out: list[str] = []
    for t in texts:
        for s in re.split(r"(?<=[.!?।])\s+", t):
            s = s.strip()
            if MIN_WORDS <= len(words(s)) <= MAX_WORDS and len(s) <= MAX_CHARS:
                out.append(s)
    return out
