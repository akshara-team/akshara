import type { Lang } from "../theme/script";
import { NIPUN_BAND, type Child } from "./teacherData";
import type { LearnerSummary } from "./types";

export type RosterEntry = {
  id: string;
  name: string;
  initials: string;
  level: string;
  lang: Lang;
  status: "in-target" | "practise";
  wcpm: number | null;
  accuracy: number;
};

export type ClassMetrics = {
  avgWcpm: number | null;
  accuracy: number;
  needHelp: number;
  total: number;
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function slug(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "child"
  );
}

/**
 * Turns the API's class summary into what the dashboard renders.
 *
 * The API returns one row per learner (`alias, language, attempts, accuracy,
 * wcpm`) and nothing else — no class name, no level, no history — so those come
 * from `known` (the demo roster) when a name matches, and are left blank
 * otherwise. Status is derived from the NIPUN band.
 */
export function toRoster(
  rows: LearnerSummary[],
  known: Child[] = [],
): { roster: RosterEntry[]; metrics: ClassMetrics } {
  const roster: RosterEntry[] = rows.map((row) => {
    const match = known.find((c) => c.name === row.alias);
    const wcpm = row.wcpm == null ? null : Math.round(row.wcpm);
    const inBand = wcpm != null && wcpm >= NIPUN_BAND.min && wcpm <= NIPUN_BAND.max;
    return {
      id: match?.id ?? slug(row.alias),
      name: row.alias,
      initials: match?.initials ?? initialsOf(row.alias),
      level: match?.level ?? "—",
      lang: (match?.lang ?? row.language) as Lang,
      status: inBand ? "in-target" : "practise",
      wcpm,
      accuracy: row.accuracy,
    };
  });

  const wcpms = roster.map((r) => r.wcpm).filter((v): v is number => v != null);
  const metrics: ClassMetrics = {
    avgWcpm: wcpms.length
      ? Math.round(wcpms.reduce((sum, v) => sum + v, 0) / wcpms.length)
      : null,
    accuracy: roster.length
      ? roster.reduce((sum, r) => sum + r.accuracy, 0) / roster.length
      : 0,
    needHelp: roster.filter((r) => r.status === "practise").length,
    total: roster.length,
  };

  return { roster, metrics };
}
