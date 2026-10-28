from datetime import date, timedelta
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class WordOut(BaseModel):
    op: str  # correct | substituted | skipped | inserted
    word: str | None
    said: str | None
    index: int | None
    check: bool = False  # counted correct, but only after a spelling-variant rule


# Measured in docs/RESULTS.md: skips and different words are caught almost always, a changed
# consonant mostly is not. Shown with every result so a green word is not read as proof.
NOTICE = (
    "Skipped and clearly different words are caught reliably. A word with one slightly wrong "
    "sound is often written down as the correct word, so green does not prove a perfect reading."
)


class AttemptOut(BaseModel):
    notice: str = NOTICE
    request_id: str
    learner: str
    passage_id: str
    language: str
    provider: str
    transcript: str
    accuracy: float
    wcpm: float | None
    words: list[WordOut]
    part_index: int | None = None  # which part was read; null for the whole passage


class LearnerSummary(BaseModel):
    alias: str
    language: str
    attempts: int
    accuracy: float
    wcpm: float | None


Language = Literal["hi-IN", "kn-IN", "ta-IN"]


def _alias(v: str | None) -> str | None:
    if v is None:
        return v
    v = " ".join(v.split())
    if not v:
        raise ValueError("alias must not be empty")
    return v


def _consent(v: date | None) -> date | None:
    # a teacher in India can be a day ahead of the server's UTC date, never more
    if v is not None and v > date.today() + timedelta(days=1):
        raise ValueError("consent date cannot be in the future")
    return v


class ChildIn(BaseModel):
    """A child as the teacher adds them. `alias` is a nickname, never the full legal name."""

    alias: str = Field(min_length=1, max_length=40)
    language: Language
    grade: int | None = Field(default=None, ge=1, le=8)
    avatar: str | None = Field(default=None, max_length=4)
    # the day a parent or guardian agreed to the child's readings being recorded (DPDP rules
    # on children's data); the teacher confirms it. Required: no consent, no child.
    consent_date: date

    _clean = field_validator("alias")(_alias)
    _check_consent = field_validator("consent_date")(_consent)


class ChildPatch(BaseModel):
    alias: str | None = Field(default=None, min_length=1, max_length=40)
    language: Language | None = None
    grade: int | None = Field(default=None, ge=1, le=8)
    avatar: str | None = Field(default=None, max_length=4)
    consent_date: date | None = None

    _clean = field_validator("alias")(_alias)
    _check_consent = field_validator("consent_date")(_consent)


class ReadingBrief(BaseModel):
    at: float
    accuracy: float
    wcpm: float | None


class ChildOut(BaseModel):
    id: int
    alias: str
    language: str
    grade: int | None
    avatar: str | None
    created_at: float | None
    consent_date: str | None = None  # YYYY-MM-DD; None for a child added before consent
    readings: int
    latest: ReadingBrief | None
    previous: ReadingBrief | None
    level: str | None = None  # from the last finished placement
    level_uncertain: bool = False  # a teacher should listen before trusting it


class ReadingOut(BaseModel):
    """One reading of a story: its parts' attempts joined, the newest try of each part."""

    session: str
    passage_id: str
    title: str | None
    language: str
    at: float
    parts: list[int]
    correct: int
    total: int
    accuracy: float
    wcpm: float | None
    seconds: float | None
    transcript: str
    words: list[WordOut]


State = Literal["correct", "error", "unsure"]


class PlacementItem(BaseModel):
    task: str  # letters | words | paragraph | story
    text: str
    words: list[str]
    passage_id: str | None


class PlacementStep(PlacementItem):
    states: list[State]
    outcome: str | None  # pass, fail, pass (half), fail (half), or open (one more item)


class PlacementOut(BaseModel):
    """An ASER-style placement. `item` is what to show next; null once `level` is known."""

    id: int
    child_id: int
    level: str | None
    uncertain: bool
    item: PlacementItem | None
    done: list[PlacementStep]


class PlacementAnswer(BaseModel):
    """The confirmed state of each word of the current item (the teacher may change marks)."""

    states: list[State]


class PlacementRead(BaseModel):
    """What the scorer heard for the current item. Nothing is recorded until it is confirmed."""

    transcript: str
    words: list[WordOut]
    states: list[State]


class SkillOut(BaseModel):
    id: str
    kind: str  # letter | vowel | sign | mark | conjunct | length
    text: str
    p: float


class SkillsOut(BaseModel):
    working_on: list[SkillOut]
    learned: list[SkillOut]


class NextOut(BaseModel):
    passage_id: str
    reason: str
    level: str | None


class AksharasOut(BaseModel):
    word: str
    aksharas: list[str]  # reading units of the script, in order (core/aksharas.py)


class PracticeOut(BaseModel):
    """One re-read of one word."""

    word: str
    said: str | None
    state: State  # correct | error | unsure


class ReviewItem(BaseModel):
    """Something a teacher should hear: one word of a reading, or a whole placement."""

    kind: Literal["word", "placement"]
    child_id: int
    child: str
    at: float
    reason: str
    request_id: str | None = None
    index: int | None = None  # the word's position in the passage or part
    word: str | None = None
    said: str | None = None
    op: str | None = None
    passage_id: str | None = None
    title: str | None = None
    has_audio: bool = False


class ReviewIn(BaseModel):
    request_id: str = Field(min_length=1, max_length=128)
    index: int = Field(ge=0)
    result: Literal["correct", "misread", "skipped"]
