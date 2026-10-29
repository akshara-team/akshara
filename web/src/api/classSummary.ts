import type { Lang } from "../theme/script";
import { nipunBand } from "../lib/nipun";
import type { Child, Level, Reader } from "./types";

export type RosterStatus = "in-target" | "practise" | "new";

export type RosterEntry = {
  id: number;
  name: string;
  initials: string;
  level: string;
  lang: Lang;
  status: RosterStatus;
  readings: number;
  wcpm: number | null;
  previousWcpm: number | null;
  accuracy: number | null;
  /** ASER level from the last placement, and whether a teacher should listen again. */
  readingLevel: Level | null;
  levelUncertain: boolean;
};

export type ClassMetrics = {
  avgWcpm: number | null;
  accuracy: number | null;
  needHelp: number;
  total: number;
};

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return [...parts[0]].slice(0, 2).join("").toUpperCase();
  return ([...parts[0]][0] + [...parts[1]][0]).toUpperCase();
}

export function levelOf(grade: number | null): string {
  return grade ? `Class ${grade}` : "—";
}

/** What the child flow needs to know about a child. */
export function toReader(c: Child): Reader {
  return {
    id: String(c.id),
    alias: c.alias,
    initials: c.avatar || initialsOf(c.alias),
    level: levelOf(c.grade),
    lang: c.language,
  };
}

const round = (v: number | null | undefined) => (v == null ? null : Math.round(v));

/**
 * The dashboard's rows and class figures from `/v1/children`. Status: the latest reading at or
 * above the band's lower edge is on target; a child with no reading yet is "new", not "needs help".
 */
export function toRoster(children: Child[]): { roster: RosterEntry[]; metrics: ClassMetrics } {
  const roster: RosterEntry[] = children.map((c) => {
    const wcpm = round(c.latest?.wcpm);
    // The FLS 2022 Grade 3 goal is the one target, per language (lib/nipun.ts).
    const band = wcpm == null ? null : nipunBand(c.language, 3, wcpm);
    const status: RosterStatus = !c.latest
      ? "new"
      : band && (band.level === "meets" || band.level === "exceeds") // at or past the goal
        ? "in-target"
        : "practise";
    return {
      id: c.id,
      name: c.alias,
      initials: c.avatar || initialsOf(c.alias),
      level: levelOf(c.grade),
      lang: c.language,
      status,
      readings: c.readings,
      wcpm,
      previousWcpm: round(c.previous?.wcpm),
      accuracy: c.latest?.accuracy ?? null,
      readingLevel: c.level ?? null,
      levelUncertain: c.level_uncertain ?? false,
    };
  });

  const read = roster.filter((r) => r.status !== "new");
  const wcpms = read.map((r) => r.wcpm).filter((v): v is number => v != null);
  const mean = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null);
  const avg = mean(wcpms);
  const metrics: ClassMetrics = {
    avgWcpm: avg == null ? null : Math.round(avg),
    accuracy: mean(read.map((r) => r.accuracy ?? 0)),
    needHelp: roster.filter((r) => r.status === "practise").length,
    total: roster.length,
  };
  return { roster, metrics };
}
