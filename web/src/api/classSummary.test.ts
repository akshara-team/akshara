import { describe, expect, it } from "vitest";
import { toRoster } from "./classSummary";
import { CHILDREN } from "./teacherData";
import type { LearnerSummary } from "./types";

const row = (
  alias: string,
  wcpm: number | null,
  accuracy = 0.9,
  language = "kn-IN",
): LearnerSummary => ({ alias, language, attempts: 3, accuracy, wcpm });

describe("toRoster", () => {
  it("derives status from the NIPUN band (35-54)", () => {
    const { roster } = toRoster([row("A", 42), row("B", 28), row("C", 60)]);
    expect(roster.map((r) => r.status)).toEqual(["in-target", "practise", "practise"]);
  });

  it("computes mean WCPM, mean accuracy and the needs-help count", () => {
    const { metrics } = toRoster([
      row("A", 40, 0.9),
      row("B", 50, 0.8),
      row("C", 30, 0.5),
    ]);
    expect(metrics.avgWcpm).toBe(40); // (40 + 50 + 30) / 3
    expect(metrics.accuracy).toBeCloseTo(0.7333, 3);
    expect(metrics.needHelp).toBe(1);
    expect(metrics.total).toBe(3);
  });

  it("excludes a null WCPM from the mean and treats it as needing help", () => {
    const { roster, metrics } = toRoster([row("A", 40), row("B", null)]);
    expect(metrics.avgWcpm).toBe(40);
    expect(roster[1].wcpm).toBeNull();
    expect(roster[1].status).toBe("practise");
  });

  it("reuses the demo level and initials when the name matches", () => {
    const { roster } = toRoster([row("Aarav Gowda", 42)], CHILDREN);
    expect(roster[0]).toMatchObject({ id: "aarav", initials: "AG", level: "Class 3" });
  });

  it("falls back to initials from the name and a blank level for unknowns", () => {
    const { roster } = toRoster([row("Meera S.", 42)]);
    expect(roster[0]).toMatchObject({ initials: "MS", level: "—", id: "meera-s" });
  });

  it("returns empty metrics for no rows", () => {
    const { roster, metrics } = toRoster([]);
    expect(roster).toEqual([]);
    expect(metrics).toMatchObject({ avgWcpm: null, accuracy: 0, needHelp: 0, total: 0 });
  });
});
