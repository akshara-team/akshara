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
  /** Which part was read; null when the whole passage was read. */
  part_index?: number | null;
};

export type Passage = {
  id: string;
  language: string;
  text: string;
  /** The parts the child reads one at a time, from the backend's split_parts(). */
  parts?: string[];
  /** From the passage catalogue; absent in older backends and the mock fixtures. */
  title?: string | null;
  /** ASER-style level of the source book ("1"-"4"). */
  level?: string | null;
  /** StoryWeaver texts are CC BY, so the credit is shown with the story. */
  credit?: { publisher?: string; url?: string; licence?: string } | null;
};

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

/** Mirrors `ReadingBrief` in the backend schemas. */
export type ReadingBrief = { at: number; accuracy: number; wcpm: number | null };

/** A child the teacher manages (`ChildOut`). `alias` is a nickname, not a full name. */
export type Child = {
  id: number;
  alias: string;
  language: Lang;
  grade: number | null;
  avatar: string | null;
  created_at: number | null;
  readings: number;
  latest: ReadingBrief | null;
  previous: ReadingBrief | null;
};

export type ChildInput = {
  alias: string;
  language: Lang;
  grade: number | null;
  avatar?: string | null;
};

/** One reading of a story: its parts joined, the newest try of each part (`ReadingOut`). */
export type Reading = {
  session: string;
  passage_id: string;
  title: string | null;
  language: string;
  /** Unix seconds. */
  at: number;
  parts: number[];
  correct: number;
  total: number;
  accuracy: number;
  wcpm: number | null;
  seconds: number | null;
  transcript: string;
  words: WordOut[];
};
