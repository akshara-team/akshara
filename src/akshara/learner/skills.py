"""The skill graph: what a child learns to read, in order, per script.

A skill is one thing a word asks of the reader:
- a letter (`letter:ಕ`) or an independent vowel (`vowel:ಅ`)
- a vowel sign (`sign:ಾ`), or the virama / Tamil pulli that kills a vowel (`sign:்`)
- a mark: anusvara, visarga, candrabindu, nukta (`mark:ं`)
- a conjunct (`conjunct:ಕ್ಷ`). The common ones get their own skill and the rest share
  `conjunct:other`.
- word length in aksharas (`length:short` 1–2, `length:medium` 3–4, `length:long` 5+), for
  holding a longer word together

The order follows the usual way a script is taught: the commonest letters, then the vowel signs
on them, then short words made of those, then the other letters, then medium words, then marks,
then conjuncts, then long words. Every word needs one length skill, so short words must come
early: with all lengths last (run 1 and 2 of the Phase 4 study), no word could be read until the
whole curriculum was known.
Within each stage the order is by how often the skill appears in the passage bank, so the first
skills unlock the most text. The order is a proposal for native review
(docs/review/SKILL_ORDER.md), not a finding.

Pure: built from text, no data files read here.
"""

from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass

from akshara.core.aksharas import parse, split
from akshara.core.script import nukta, virama
from akshara.core.text import words

CORE_LETTERS = 12  # letters taught before any vowel sign
COMMON_CONJUNCT_SHARE = 0.8  # conjuncts covering this share of occurrences get their own skill
MAX_CONJUNCTS = 30
LENGTHS = ("short", "medium", "long")
STAGES = (
    "core letters",
    "vowel signs",
    "short words",
    "other letters",
    "medium words",
    "marks",
    "conjuncts",
    "long words",
)


def length_band(n_aksharas: int) -> str:
    return "short" if n_aksharas <= 2 else "medium" if n_aksharas <= 4 else "long"


def _raw_skills(word: str, lang: str) -> list[str]:
    """Skills of a word before conjuncts are pooled into common / other."""
    vir, nuk = virama(lang), nukta(lang)
    out: list[str] = []
    parts = split(word, lang)
    for text in parts:
        a = parse(text, lang)
        if a.vowel:
            out.append(f"vowel:{a.vowel}")
        for c in a.consonants:
            base = c.replace(nuk, "") if nuk else c
            out.append(f"letter:{base}")
            if nuk and nuk in c:
                out.append(f"mark:{nuk}")
        if len(a.consonants) > 1:
            out.append(
                "conjunct:" + vir.join(c.replace(nuk, "") if nuk else c for c in a.consonants)
            )
        if a.sign:
            out.append(f"sign:{a.sign}")
        if a.dead:
            out.append(f"sign:{vir}")
        out += [f"mark:{m}" for m in a.marks]
    out.append(f"length:{length_band(len(parts))}")
    return out


@dataclass(frozen=True)
class Skill:
    id: str
    stage: str
    count: int  # occurrences in the bank the curriculum was built from

    @property
    def kind(self) -> str:
        return self.id.split(":", 1)[0]

    @property
    def text(self) -> str:
        return self.id.split(":", 1)[1]


@dataclass(frozen=True)
class Curriculum:
    lang: str
    skills: tuple[Skill, ...]  # in teaching order
    common_conjuncts: frozenset[str]

    def position(self, skill_id: str) -> int:
        return self._index()[skill_id]

    def _index(self) -> dict[str, int]:
        return {s.id: i for i, s in enumerate(self.skills)}

    def skills_of(self, word: str) -> list[str]:
        """The skills reading `word` needs, each once, in teaching order."""
        index = self._index()
        found = []
        for s in _raw_skills(word, self.lang):
            if s.startswith("conjunct:") and s not in self.common_conjuncts:
                s = "conjunct:other"
            if s in index and s not in found:
                found.append(s)
        return sorted(found, key=index.__getitem__)


def build(texts: Iterable[str], lang: str) -> Curriculum:
    """The curriculum for one language, from the passages it will be used on."""
    counts: Counter[str] = Counter()
    for t in texts:
        for w in words(t):
            counts.update(_raw_skills(w, lang))

    conj = sorted(
        ((s, n) for s, n in counts.items() if s.startswith("conjunct:")),
        key=lambda x: (-x[1], x[0]),
    )
    total = sum(n for _, n in conj)
    common, covered = [], 0
    for s, n in conj:
        if covered >= COMMON_CONJUNCT_SHARE * total or len(common) >= MAX_CONJUNCTS:
            break
        common.append(s)
        covered += n
    pooled: Counter[str] = Counter(
        {s: n for s, n in counts.items() if not s.startswith("conjunct:")}
    )
    for s, n in conj:
        pooled[s if s in common else "conjunct:other"] += n

    def by_count(ids: Iterable[str]) -> list[str]:
        return sorted(ids, key=lambda s: (-pooled[s], s))

    letters = by_count(s for s in pooled if s.startswith(("letter:", "vowel:")))
    order: list[tuple[str, str]] = []
    order += [(s, STAGES[0]) for s in letters[:CORE_LETTERS]]
    order += [(s, STAGES[1]) for s in by_count(s for s in pooled if s.startswith("sign:"))]
    length = {x: [f"length:{x}"] if f"length:{x}" in pooled else [] for x in LENGTHS}
    order += [(s, STAGES[2]) for s in length["short"]]
    order += [(s, STAGES[3]) for s in letters[CORE_LETTERS:]]
    order += [(s, STAGES[4]) for s in length["medium"]]
    order += [(s, STAGES[5]) for s in by_count(s for s in pooled if s.startswith("mark:"))]
    conj_ids = by_count(common)
    if "conjunct:other" in pooled:
        conj_ids.append("conjunct:other")
    order += [(s, STAGES[6]) for s in conj_ids]
    order += [(s, STAGES[7]) for s in length["long"]]
    skills = tuple(Skill(s, stage, pooled[s]) for s, stage in order)
    return Curriculum(lang, skills, frozenset(common))
