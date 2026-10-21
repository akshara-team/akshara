from pydantic import BaseModel


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
