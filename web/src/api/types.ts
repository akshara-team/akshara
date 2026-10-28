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
  /** YYYY-MM-DD a parent or guardian agreed, as the teacher confirmed; null before WP7. */
  consent_date?: string | null;
  readings: number;
  latest: ReadingBrief | null;
  previous: ReadingBrief | null;
  /** ASER level from the last finished placement; null before any. */
  level?: Level | null;
  /** The placement leaned on marks the scorer was unsure of: a teacher should listen. */
  level_uncertain?: boolean;
};

export type ChildInput = {
  alias: string;
  language: Lang;
  grade: number | null;
  avatar?: string | null;
  /** YYYY-MM-DD a parent or guardian agreed. Required to add a child; never removed. */
  consent_date?: string | null;
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

/** ASER reading levels, lowest first. */
export type Level = "beginner" | "letter" | "word" | "paragraph" | "story";

export type MarkState = "correct" | "error" | "unsure";

export type PlacementItem = {
  task: "letters" | "words" | "paragraph" | "story";
  text: string;
  words: string[];
  passage_id: string | null;
};

export type Placement = {
  id: number;
  child_id: number;
  level: Level | null;
  uncertain: boolean;
  /** What to show next; null once the level is known. */
  item: PlacementItem | null;
  done: (PlacementItem & { states: MarkState[]; outcome: string | null })[];
};

export type PlacementRead = { transcript: string; words: WordOut[]; states: MarkState[] };

export type SkillOut = { id: string; kind: string; text: string; p: number };
export type Skills = { working_on: SkillOut[]; learned: SkillOut[] };

export type Practice = { word: string; said: string | null; state: MarkState };

export type ReviewResult = "correct" | "misread" | "skipped";

/** Something a teacher should hear: one word of a reading, or a whole placement. */
export type ReviewItem = {
  kind: "word" | "placement";
  child_id: number;
  child: string;
  at: number;
  reason: string;
  request_id?: string | null;
  index?: number | null;
  word?: string | null;
  said?: string | null;
  op?: string | null;
  passage_id?: string | null;
  title?: string | null;
  has_audio?: boolean;
};

export type Next = { passage_id: string; reason: string; level: Level | null };

/**
 * A practice sentence (`SentenceOut`). `evon`: written by Evon, checked by code, shown to a
 * child only once a teacher approves it. `story`: cut from a published story.
 */
export type Sentence = {
  id: string;
  lang: Lang;
  text: string;
  source: "evon" | "story";
  /** What Evon was asked to practise; null for a story sentence. */
  skill: string | null;
  skills: string[];
  status: "pending" | "approved" | "rejected" | "story";
};

/** The sentence picked for one child, and the skill it was picked for. */
export type SentenceFor = Sentence & { practises: string };

export type SentenceRead = { id: string; words: WordOut[]; states: MarkState[]; accuracy: number };
