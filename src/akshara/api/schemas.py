from pydantic import BaseModel


class WordOut(BaseModel):
    op: str  # correct | substituted | skipped | inserted
    word: str | None
    said: str | None
    index: int | None


class AttemptOut(BaseModel):
    request_id: str
    learner: str
    passage_id: str
    language: str
    provider: str
    transcript: str
    accuracy: float
    wcpm: float | None
    words: list[WordOut]


class LearnerSummary(BaseModel):
    alias: str
    language: str
    attempts: int
    accuracy: float
    wcpm: float | None
