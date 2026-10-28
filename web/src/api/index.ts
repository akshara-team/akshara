import type { Lang } from "../theme/script";
import { liveApi } from "./live";
import { MOCK_PARTS, MOCK_PASSAGE, MOCK_TITLE, mockAttempt, mockPassages } from "./mock";
import { mockClass } from "./mockClass";
import type {
  Attempt,
  Child,
  ChildInput,
  MarkState,
  Next,
  Passage,
  Placement,
  PlacementRead,
  Practice,
  Reading,
  ReviewItem,
  ReviewResult,
  Skills,
} from "./types";

/**
 * The one seam between the screens and the backend. `mock` runs the whole app
 * with no server (the design's demo data); `live` talks to FastAPI /v1.
 * Pick with VITE_API_MODE in web/.env.
 */
export type Api = {
  listPassages: (lang: Lang) => Promise<Passage[]>;
  /** Split a passage into the parts the child reads one at a time. */
  partsOf: (passage: Passage) => string[];
  submitAttempt: (args: {
    audio: Blob;
    learner: string;
    /** The child the teacher added, when the reader is one. */
    childId?: number;
    /** One run of a story; its parts become one reading for the teacher. */
    session?: string;
    passageId: string;
    title?: string | null;
    lang: Lang;
    partIndex: number;
  }) => Promise<Attempt>;
  listChildren: (lang?: Lang) => Promise<Child[]>;
  getChild: (id: number) => Promise<Child>;
  addChild: (input: ChildInput) => Promise<Child>;
  editChild: (id: number, patch: Partial<ChildInput>) => Promise<Child>;
  /** Remove the child and everything about them: readings, recordings, marks, level. */
  deleteChild: (id: number) => Promise<void>;
  childReadings: (id: number) => Promise<Reading[]>;
  getPassage: (id: string) => Promise<Passage>;
  /** The learner model's pick for this child's next story. */
  nextFor: (childId: number) => Promise<Next>;
  childSkills: (id: number) => Promise<Skills>;
  startPlacement: (childId: number) => Promise<Placement>;
  getPlacement: (id: number) => Promise<Placement>;
  /** Score a recording of the current item; records nothing until answered. */
  readPlacement: (id: number, audio: Blob) => Promise<PlacementRead>;
  answerPlacement: (id: number, states: MarkState[]) => Promise<Placement>;
  /** Words and placements a teacher should hear, newest first. */
  reviewQueue: (lang?: Lang) => Promise<ReviewItem[]>;
  /** A teacher's mark on one word; replaces the scorer's. */
  markWord: (requestId: string, index: number, result: ReviewResult) => Promise<void>;
  /** Where to play one word of a kept recording; null when there is none (mock mode). */
  clipUrl: (requestId: string, index: number) => string | null;
  /** A word split into its aksharas, the units the script is read in. */
  aksharas: (word: string, lang: Lang) => Promise<string[]>;
  /** Score one re-read of one word; teaches the child's model when `childId` is given. */
  practise: (audio: Blob | null, word: string, lang: Lang, childId?: number) => Promise<Practice>;
  /** Model audio for one word; null means "no model audio, fall back". */
  feedbackAudio: (word: string, lang: Lang) => Promise<Blob | null>;
};

const mock: Api = {
  listPassages: async (lang) => mockPassages(lang),
  partsOf: () => MOCK_PARTS.map((p) => p.text),
  submitAttempt: async ({ childId, session, passageId, title, lang, partIndex }) => {
    const attempt = mockAttempt(passageId, lang, partIndex);
    if (childId !== undefined && session) {
      mockClass.record(childId, session, attempt, title ?? MOCK_TITLE);
    }
    return attempt;
  },
  listChildren: (lang) => mockClass.listChildren(lang),
  getChild: (id) => mockClass.getChild(id),
  addChild: (input) => mockClass.addChild(input),
  editChild: (id, patch) => mockClass.editChild(id, patch),
  deleteChild: (id) => mockClass.deleteChild(id),
  childReadings: (id) => mockClass.childReadings(id),
  getPassage: async (id) => ({ ...MOCK_PASSAGE, id }),
  nextFor: (id) => mockClass.nextFor(id),
  childSkills: (id) => mockClass.childSkills(id),
  startPlacement: (id) => mockClass.startPlacement(id),
  getPlacement: (id) => mockClass.getPlacement(id),
  readPlacement: (id) => mockClass.readPlacement(id),
  answerPlacement: (id, states) => mockClass.answerPlacement(id, states),
  aksharas: async (word, lang) => graphemes(word, lang),
  reviewQueue: (lang) => mockClass.reviewQueue(lang),
  markWord: (rid, index, result) => mockClass.markWord(rid, index, result),
  clipUrl: () => null,
  // The demo has no scorer: a re-read always counts.
  practise: async (_audio, word) => ({ word, said: word, state: "correct" }),
  feedbackAudio: async () => null, // mock uses the device voice
};

const live: Api = {
  listPassages: (lang) => liveApi.listPassages(lang),
  partsOf: (passage) => liveApi.partsOf(passage),
  submitAttempt: ({ audio, learner, childId, session, passageId, partIndex }) =>
    liveApi.submitAttempt({ audio, learner, childId, session, passageId, partIndex }),
  listChildren: (lang) => liveApi.listChildren(lang),
  getChild: (id) => liveApi.getChild(id),
  addChild: (input) => liveApi.addChild(input),
  editChild: (id, patch) => liveApi.editChild(id, patch),
  deleteChild: (id) => liveApi.deleteChild(id),
  childReadings: (id) => liveApi.childReadings(id),
  getPassage: (id) => liveApi.getPassage(id),
  nextFor: (id) => liveApi.nextFor(id),
  childSkills: (id) => liveApi.childSkills(id),
  startPlacement: (id) => liveApi.startPlacement(id),
  getPlacement: (id) => liveApi.getPlacement(id),
  readPlacement: (id, audio) => liveApi.readPlacement(id, audio),
  answerPlacement: (id, states) => liveApi.answerPlacement(id, states),
  aksharas: (word, lang) => liveApi.aksharas(word, lang),
  reviewQueue: (lang) => liveApi.reviewQueue(lang),
  markWord: (rid, index, result) => liveApi.markWord(rid, index, result),
  clipUrl: (rid, index) => liveApi.clipUrl(rid, index),
  practise: (audio, word, lang, childId) =>
    liveApi.practise(audio ?? new Blob([], { type: "audio/wav" }), word, lang, childId),
  feedbackAudio: (word, lang) => liveApi.feedbackAudio(word, lang),
};

/** Mock mode's akshara split: the browser's grapheme clusters, close to aksharas. */
function graphemes(word: string, lang: Lang): string[] {
  const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (!Seg) return [...word];
  return [...new Seg(lang, { granularity: "grapheme" }).segment(word)].map((s) => s.segment);
}

export const isMock = import.meta.env.VITE_API_MODE !== "live";

export const api: Api = isMock ? mock : live;

/** The child id behind a reader, or undefined for an old locally saved demo reader. */
export function childIdOf(readerId: string | undefined): number | undefined {
  return readerId && /^\d+$/.test(readerId) ? Number(readerId) : undefined;
}

/** HTTP status of an API failure in either mode (both error classes carry `status`). */
export function statusOf(error: unknown): number | null {
  const s = (error as { status?: unknown } | null)?.status;
  return typeof s === "number" ? s : null;
}

/**
 * The story a child reads next: one the teacher chose, else the learner model's pick for a
 * child the teacher added, else the first story in the language. Null when there is none.
 */
export async function storyFor(
  lang: Lang,
  childId: number | undefined,
  chosen?: string | null,
): Promise<Passage | null> {
  if (chosen) return api.getPassage(chosen);
  if (childId !== undefined) {
    try {
      const next = await api.nextFor(childId);
      return await api.getPassage(next.passage_id);
    } catch {
      /* fall through to the first story */
    }
  }
  const passages = await api.listPassages(lang);
  return passages[0] ?? null;
}
