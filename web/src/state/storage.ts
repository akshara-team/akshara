import type { Part, Reader, WordOut } from "../api/types";
import type { Lang } from "../theme/script";

const KEY = "akshara.v1";
const MAX_READINGS = 50;

export type StoredReading = {
  /** The reading session id, so a re-mounted results screen cannot double-save. */
  id: string;
  passageId: string;
  storyTitle: string;
  language: Lang;
  at: string; // ISO date
  parts: number;
  accuracy: number;
  wcpm: number | null;
  seconds: number;
  words: WordOut[];
};

export type ChildStore = {
  reader: Reader | null;
  lang: Lang;
  readings: StoredReading[];
};

export const EMPTY_STORE: ChildStore = { reader: null, lang: "kn-IN", readings: [] };

/** localStorage can be missing (SSR, tests) or throw (private mode, quota). */
function storage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function load(): ChildStore {
  const s = storage();
  if (!s) return { ...EMPTY_STORE };
  try {
    const raw = s.getItem(KEY);
    if (!raw) return { ...EMPTY_STORE };
    const parsed = JSON.parse(raw) as Partial<ChildStore>;
    return {
      reader: parsed.reader ?? null,
      lang: (parsed.lang as Lang) ?? EMPTY_STORE.lang,
      readings: Array.isArray(parsed.readings) ? parsed.readings : [],
    };
  } catch {
    return { ...EMPTY_STORE };
  }
}

export function save(next: ChildStore): ChildStore {
  const s = storage();
  if (s) {
    try {
      s.setItem(KEY, JSON.stringify(next));
    } catch {
      /* quota or a blocked store: the app still works, it just forgets */
    }
  }
  return next;
}

export function setReaderAndLang(reader: Reader, lang: Lang): ChildStore {
  return save({ ...load(), reader, lang });
}

export function setLanguage(lang: Lang): ChildStore {
  return save({ ...load(), lang });
}

export function addReading(reading: StoredReading): ChildStore {
  const current = load();
  const readings = [
    reading,
    ...current.readings.filter((r) => r.id !== reading.id),
  ].slice(0, MAX_READINGS);
  return save({ ...current, readings });
}

export function clearChild(): ChildStore {
  return save({ ...EMPTY_STORE });
}

/**
 * Pure aggregation for one finished story. Returns null until every part has an
 * attempt, so a half-read story is never recorded as a reading.
 */
export function buildReading(args: {
  id: string;
  passageId: string;
  storyTitle: string;
  language: Lang;
  parts: Part[];
  at?: string;
}): StoredReading | null {
  const done = args.parts.filter((p) => p.attempt);
  if (args.parts.length === 0 || done.length !== args.parts.length) return null;

  const words = done.flatMap((p) => p.attempt?.words ?? []);
  const totalWords = words.length;
  const correct = words.filter((w) => w.op === "correct").length;
  const seconds = done.reduce((sum, p) => sum + (p.seconds ?? 0), 0);

  return {
    id: args.id,
    passageId: args.passageId,
    storyTitle: args.storyTitle,
    language: args.language,
    at: args.at ?? new Date().toISOString(),
    parts: done.length,
    accuracy: totalWords ? correct / totalWords : 0,
    wcpm: seconds > 0 ? Math.round((correct / seconds) * 60) : null,
    seconds,
    words,
  };
}
