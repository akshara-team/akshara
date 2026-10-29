import type { Lang } from "../theme/script";

export type FslLevel = "below" | "partially" | "meets" | "exceeds";

/** The "Meets Global Minimum Proficiency" band — the end-of-Grade-3 goal. */
export type FslGoal = { low: number; high: number };

export type FslBand = {
  level: FslLevel;
  /** This level's own range in correct words per minute; `max` is null for the open top level. */
  min: number;
  max: number | null;
  /** The goal band: what "Meets" looks like for this language. */
  goal: FslGoal;
};

/**
 * Foundational Learning Study (FLS) 2022 national report, each language's
 * "Benchmark of ORF with Comprehension and Student Performance" table (Grade 3).
 * The three numbers are the top of the 1st, 2nd and 3rd Global Proficiency
 * levels in correct words per minute (cwpm); the 4th, "Exceeds", is open-ended.
 *
 *   Hindi   pp. 29: 0-16 | 17-34 | 35-54 | 55+
 *   Kannada pp. 32: 0-13 | 14-29 | 30-48 | 49+
 *   Tamil   pp. 62: 0-8  | 9-27  | 28-49 | 50+
 *
 * FLS 2022 assessed Grade 3 only, so no other grade has a band.
 */
const CUTS: Record<Lang, readonly [number, number, number]> = {
  "hi-IN": [16, 34, 54],
  "kn-IN": [13, 29, 48],
  "ta-IN": [8, 27, 49],
};

/**
 * The end-of-Grade-3 goal band (the "Meets" level) for a language, or null when
 * the language has no benchmark. FLS 2022 set Grade 3 only, so this is the one
 * goal every child is shown against.
 */
export function fslGoal(lang: Lang): FslGoal | null {
  const cuts = CUTS[lang];
  if (!cuts) return null;
  return { low: cuts[1] + 1, high: cuts[2] };
}

/**
 * Places a reading in the FLS 2022 Grade 3 level for its language, with the
 * end-of-Grade-3 goal to show it against. Returns null when the grade has no
 * band, or the reading is not a real number.
 */
export function nipunBand(lang: Lang, grade: number, wcpm: number): FslBand | null {
  const cuts = CUTS[lang];
  const goal = grade === 3 ? fslGoal(lang) : null;
  if (!cuts || !goal || !Number.isFinite(wcpm)) return null;

  const [belowMax, partialMax, meetsMax] = cuts;
  if (wcpm <= belowMax) return { level: "below", min: 0, max: belowMax, goal };
  if (wcpm <= partialMax) return { level: "partially", min: belowMax + 1, max: partialMax, goal };
  if (wcpm <= meetsMax) return { level: "meets", min: partialMax + 1, max: meetsMax, goal };
  return { level: "exceeds", min: meetsMax + 1, max: null, goal };
}
