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


class ChildIn(BaseModel):
    """A child as the teacher adds them. `alias` is a nickname, never the full legal name."""

    alias: str = Field(min_length=1, max_length=40)
    language: Language
    grade: int | None = Field(default=None, ge=1, le=8)
    avatar: str | None = Field(default=None, max_length=4)

    _clean = field_validator("alias")(_alias)


class ChildPatch(BaseModel):
    alias: str | None = Field(default=None, min_length=1, max_length=40)
    language: Language | None = None
    grade: int | None = Field(default=None, ge=1, le=8)
    avatar: str | None = Field(default=None, max_length=4)

    _clean = field_validator("alias")(_alias)


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
    readings: int
    latest: ReadingBrief | None
    previous: ReadingBrief | None


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
