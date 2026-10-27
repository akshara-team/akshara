import type { Lang } from "../theme/script";
import { MOCK_TITLE, mockReferenceWords } from "./mock";
import type { Attempt, Child, ChildInput, Reading, ReadingBrief, WordOut } from "./types";

/**
 * Mock mode's class: the same shapes as `/v1/children`, kept in the browser so the public
 * demo can add a child, read as them and see the reading in their profile. Seeded with
 * invented children; nothing here is an observed result.
 */

type ChildRow = Omit<Child, "readings" | "latest" | "previous">;

export type PartAttempt = {
  childId: number;
  session: string;
  passage_id: string;
  title: string | null;
  language: string;
  part_index: number | null;
  /** Unix seconds. */
  at: number;
  seconds: number | null;
  transcript: string;
  words: WordOut[];
};

type MockClass = { nextId: number; children: ChildRow[]; attempts: PartAttempt[] };

const KEY = "akshara.mockclass.v1";

/** A reading of the demo story with `accuracy` of its words right, mistakes spread out. */
function seededReading(
  childId: number,
  date: string,
  wcpm: number,
  accuracy: number,
): PartAttempt {
  const ref = mockReferenceWords();
  const correct = Math.round(accuracy * ref.length);
  const wrong = ref.length - correct;
  const bad = new Set(
    Array.from({ length: wrong }, (_, k) => Math.floor(((k + 1) * ref.length) / (wrong + 1))),
  );
  let k = 0;
  const words: WordOut[] = ref.map((word, index) => {
    if (!bad.has(index)) return { op: "correct", word, said: word, index, check: false };
    k += 1;
    return k % 2
      ? { op: "substituted", word, said: ref[(index + 3) % ref.length], index, check: false }
      : { op: "skipped", word, said: null, index, check: false };
  });
  return {
    childId,
    session: `seed-${childId}-${date}`,
    passage_id: "kn-101",
    title: MOCK_TITLE,
    language: "kn-IN",
    part_index: null,
    at: Date.parse(`${date}T10:00:00+05:30`) / 1000,
    seconds: (correct / wcpm) * 60,
    transcript: words
      .map((w) => w.said ?? "")
      .filter(Boolean)
      .join(" "),
    words,
  };
}

function seed(): MockClass {
  const made = Date.parse("2026-10-01T09:00:00+05:30") / 1000;
  const child = (id: number, alias: string, language: Lang, grade: number): ChildRow => ({
    id,
    alias,
    language,
    grade,
    avatar: null,
    created_at: made,
  });
  const history: [number, [string, number, number][]][] = [
    [
      1,
      [
        ["2026-10-05", 30, 0.8],
        ["2026-10-12", 36, 0.85],
        ["2026-10-19", 42, 0.9],
      ],
    ],
    [
      2,
      [
        ["2026-10-12", 46, 0.9],
        ["2026-10-19", 50, 0.95],
      ],
    ],
    [
      3,
      [
        ["2026-10-05", 24, 0.65],
        ["2026-10-19", 28, 0.7],
      ],
    ],
  ];
  return {
    nextId: 6,
    children: [
      child(1, "Aarav Gowda", "kn-IN", 3),
      child(2, "Diya K.", "kn-IN", 2),
      child(3, "Rohan M.", "kn-IN", 3),
      child(4, "Kavin S.", "ta-IN", 2),
      child(5, "Isha R.", "hi-IN", 3),
    ],
    attempts: history.flatMap(([id, rows]) =>
      rows.map(([date, wcpm, acc]) => seededReading(id, date, wcpm, acc)),
    ),
  };
}

let memory: MockClass | null = null;

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

function state(): MockClass {
  if (memory) return memory;
  try {
    const raw = storage()?.getItem(KEY);
    memory = raw ? (JSON.parse(raw) as MockClass) : seed();
  } catch {
    memory = seed();
  }
  return memory;
}

function persist(): void {
  try {
    storage()?.setItem(KEY, JSON.stringify(state()));
  } catch {
    /* private mode or full: the class lives in memory for this visit */
  }
}

/** Back to the seeded class (tests, and a "reset demo" later). */
export function resetMockClass(): void {
  memory = seed();
  try {
    storage()?.removeItem(KEY);
  } catch {
    /* nothing stored */
  }
}

/** Same rules as `summarise` in `src/akshara/store.py`. */
export function summariseReading(group: PartAttempt[]): Reading {
  const latest = new Map<number | null, PartAttempt>();
  for (const a of [...group].sort((x, y) => x.at - y.at)) latest.set(a.part_index, a);
  const parts = [...latest.entries()]
    .sort(([a], [b]) => (a ?? -1) - (b ?? -1))
    .map(([, a]) => a);
  const words = parts.flatMap((a) => a.words);
  const total = words.filter((w) => w.op !== "inserted").length;
  const correct = words.filter((w) => w.op === "correct").length;
  const seconds = parts.every((a) => a.seconds)
    ? parts.reduce((s, a) => s + (a.seconds ?? 0), 0)
    : null;
  return {
    session: group[0].session,
    passage_id: group[0].passage_id,
    title: group[0].title,
    language: group[0].language,
    at: Math.min(...group.map((a) => a.at)),
    parts: parts.map((a) => a.part_index).filter((i): i is number => i !== null),
    correct,
    total,
    accuracy: total ? correct / total : 0,
    wcpm: seconds ? correct / (seconds / 60) : null,
    seconds,
    transcript: parts
      .map((a) => a.transcript)
      .filter(Boolean)
      .join(" "),
    words,
  };
}

function readingsOf(childId: number): Reading[] {
  const groups = new Map<string, PartAttempt[]>();
  for (const a of state().attempts.filter((x) => x.childId === childId)) {
    groups.set(a.session, [...(groups.get(a.session) ?? []), a]);
  }
  return [...groups.values()].map(summariseReading).sort((a, b) => b.at - a.at);
}

const brief = (r: Reading | undefined): ReadingBrief | null =>
  r ? { at: r.at, accuracy: r.accuracy, wcpm: r.wcpm } : null;

function out(row: ChildRow): Child {
  const rs = readingsOf(row.id);
  return { ...row, readings: rs.length, latest: brief(rs[0]), previous: brief(rs[1]) };
}

/** Same status codes as the API, so the screens handle both modes the same way. */
export class MockApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function find(id: number): ChildRow {
  const row = state().children.find((c) => c.id === id);
  if (!row) throw new MockApiError(404, "unknown child");
  return row;
}

function clean(alias: string): string {
  const a = alias.split(/\s+/).filter(Boolean).join(" ");
  if (!a || a.length > 40) throw new MockApiError(422, "name must be 1-40 characters");
  return a;
}

function taken(alias: string, except?: number): boolean {
  return state().children.some((c) => c.alias === alias && c.id !== except);
}

export const mockClass = {
  async listChildren(lang?: string): Promise<Child[]> {
    return state()
      .children.filter((c) => !lang || c.language === lang)
      .sort((a, b) => a.alias.localeCompare(b.alias))
      .map(out);
  },

  async getChild(id: number): Promise<Child> {
    return out(find(id));
  },

  async addChild(input: ChildInput): Promise<Child> {
    const alias = clean(input.alias);
    if (taken(alias)) throw new MockApiError(409, "a child with this name already exists");
    const s = state();
    const row: ChildRow = {
      id: s.nextId++,
      alias,
      language: input.language,
      grade: input.grade,
      avatar: input.avatar ?? null,
      created_at: Date.now() / 1000,
    };
    s.children.push(row);
    persist();
    return out(row);
  },

  async editChild(id: number, patch: Partial<ChildInput>): Promise<Child> {
    const row = find(id);
    const alias = patch.alias === undefined ? row.alias : clean(patch.alias);
    if (taken(alias, id)) throw new MockApiError(409, "a child with this name already exists");
    Object.assign(row, { ...patch, alias });
    persist();
    return out(row);
  },

  async childReadings(id: number): Promise<Reading[]> {
    find(id);
    return readingsOf(id);
  },

  /** Files a scored part under the child, as the API does for `child_id` + `session`. */
  record(childId: number, session: string, attempt: Attempt, title: string | null): void {
    if (!state().children.some((c) => c.id === childId)) return;
    const correct = attempt.words.filter((w) => w.op === "correct").length;
    state().attempts.push({
      childId,
      session,
      passage_id: attempt.passage_id,
      title,
      language: attempt.language,
      part_index: attempt.part_index ?? null,
      at: Date.now() / 1000,
      seconds: attempt.wcpm ? (correct / attempt.wcpm) * 60 : null,
      transcript: attempt.transcript,
      words: attempt.words,
    });
    persist();
  },
};
