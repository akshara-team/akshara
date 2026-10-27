import type { Level, MarkState } from "./types";

/**
 * The ASER placement rules, the same as `src/akshara/learner/placement.py`, for mock mode.
 * Start on a paragraph; passed → story, failed → words → letters. Letters and words pass at
 * 4 of 5, paragraph and story at 85%. When `unsure` marks decide the call, one more item of the
 * same task is given; if it is still open, unsure counts half and the result is `uncertain`.
 */
export type Task = "letters" | "words" | "paragraph" | "story";

const ITEM_PASS: Record<Task, number> = { letters: 0.8, words: 0.8, paragraph: 0.85, story: 0.85 };
const MAX_ITEMS = 2;

const NEXT: Record<Task, { pass: [Task | null, Level | null]; fail: [Task | null, Level | null] }> =
  {
    paragraph: { pass: ["story", null], fail: ["words", null] },
    story: { pass: [null, "story"], fail: [null, "paragraph"] },
    words: { pass: [null, "word"], fail: ["letters", null] },
    letters: { pass: [null, "letter"], fail: [null, "beginner"] },
  };

function passes(states: MarkState[], task: Task, unsureAs: number): boolean {
  if (!states.length) return false;
  const right =
    states.filter((s) => s === "correct").length +
    unsureAs * states.filter((s) => s === "unsure").length;
  return right / states.length >= ITEM_PASS[task] - 1e-9;
}

export type PlacementState = {
  task: Task | null;
  level: Level | null;
  uncertain: boolean;
  /** Outcome of each answered item: pass, fail, pass (half), fail (half) or open. */
  outcomes: string[];
};

/** The placement after these answered items, in order. */
export function replay(answers: MarkState[][]): PlacementState {
  const s: PlacementState = { task: "paragraph", level: null, uncertain: false, outcomes: [] };
  let pool: MarkState[] = [];
  let given = 0;
  for (const states of answers) {
    const task = s.task;
    if (!task) throw new Error("placement is finished");
    given += 1;
    pool = [...pool, ...states];
    const low = passes(pool, task, 0);
    const high = passes(pool, task, 1);
    let ok: boolean | null = null;
    if (low === high) {
      ok = low;
      s.outcomes.push(ok ? "pass" : "fail");
    } else if (given < MAX_ITEMS) {
      s.outcomes.push("open");
    } else {
      s.uncertain = true;
      ok = passes(pool, task, 0.5);
      s.outcomes.push(ok ? "pass (half)" : "fail (half)");
    }
    if (ok !== null) {
      [s.task, s.level] = NEXT[task][ok ? "pass" : "fail"];
      pool = [];
      given = 0;
    }
  }
  return s;
}
