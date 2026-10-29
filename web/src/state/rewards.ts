import type { StoredReading } from "./storage";

/** The child's own calendar day (YYYY-MM-DD) for an ISO timestamp. */
export function localDay(at: string): string {
  const d = new Date(at);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** The distinct local days with a reading, oldest first. */
function readingDays(readings: StoredReading[]): string[] {
  return [...new Set(readings.map((r) => localDay(r.at)))].sort();
}

/** The day `delta` days after a YYYY-MM-DD string, staying in local time. */
function shiftDay(day: string, delta: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const next = new Date(year, month - 1, date + delta);
  const m = String(next.getMonth() + 1).padStart(2, "0");
  const d = String(next.getDate()).padStart(2, "0");
  return `${next.getFullYear()}-${m}-${d}`;
}

/**
 * One star per finished story.
 *
 * Every saved reading is a finished story (`buildReading` refuses a half-read
 * one), so this is the length of the history. That history is capped at 50 and
 * is forgotten on this device if the reader is forgotten, so stars do not
 * follow a child between devices.
 */
export function starCount(readings: StoredReading[]): number {
  return readings.length;
}

/**
 * Consecutive days with a reading, counting back from today. A run that ended
 * yesterday is still alive today ("grace"), since the child has not had a
 * chance to read yet; a run that ended two days ago is over.
 */
export function currentStreak(readings: StoredReading[], now: Date = new Date()): number {
  const days = new Set(readingDays(readings));
  if (days.size === 0) return 0;

  const today = localDay(now.toISOString());
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  if (!days.has(cursor)) return 0;

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

/** The longest run of consecutive reading days anywhere in the history. */
export function bestStreak(readings: StoredReading[]): number {
  let best = 0;
  let run = 0;
  let previous = "";
  for (const day of readingDays(readings)) {
    run = previous && shiftDay(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}
