import type { Lang } from "../theme/script";

/** Mirrors the backend's Pydantic schemas (`src/akshara/api/schemas.py`). */
export type WordOp = "correct" | "substituted" | "skipped" | "inserted";

export type WordOut = {
  op: WordOp;
  word: string | null;
  said: string | null;
  index: number | null;
  /** true when the word counted correct only via a spelling-variant rule. */
  check: boolean;
};

export type Attempt = {
  notice: string;
  request_id: string;
  learner: string;
  passage_id: string;
  language: string;
  provider: string;
  transcript: string;
  accuracy: number;
  wcpm: number | null;
  words: WordOut[];
};

export type Passage = { id: string; language: string; text: string };

export type LearnerSummary = {
  alias: string;
  language: string;
  attempts: number;
  accuracy: number;
  wcpm: number | null;
};

/** Frontend-only: the design's reading flow splits a passage into parts. */
export type Part = {
  index: number;
  text: string;
  attempt: Attempt | null;
  /** Seconds the child took, measured client-side; null until they read it. */
  seconds: number | null;
};

export type Reader = {
  id: string;
  alias: string;
  initials: string;
  level: string;
  lang: Lang;
};
