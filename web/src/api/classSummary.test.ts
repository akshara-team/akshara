import { describe, expect, it } from "vitest";
import { initialsOf, toReader, toRoster } from "./classSummary";
import type { Child } from "./types";

const child = (
  id: number,
  alias: string,
  wcpm: number | null | "none",
  accuracy = 0.9,
  previous: number | null = null,
): Child => ({
  id,
  alias,
  language: "kn-IN",
  grade: 3,
  avatar: null,
  created_at: 0,
  readings: wcpm === "none" ? 0 : previous == null ? 1 : 2,
  latest: wcpm === "none" ? null : { at: 2, accuracy, wcpm },
  previous: previous == null ? null : { at: 1, accuracy, wcpm: previous },
});

describe("toRoster", () => {
  it("derives status from the latest reading against the Kannada goal (30-48)", () => {
    const { roster } = toRoster([
      child(1, "A", 42),
      child(2, "B", 28),
      child(3, "C", 60),
      child(4, "D", 35),
      child(5, "E", null),
    ]);
    expect(roster.map((r) => r.status)).toEqual([
      "in-target",
      "practise",
      "in-target",
      "in-target",
      "practise",
    ]);
  });

  it("calls a child with no reading new, and leaves them out of the class figures", () => {
    const { roster, metrics } = toRoster([child(1, "A", 40, 0.8), child(2, "New", "none")]);
    expect(roster[1]).toMatchObject({ status: "new", wcpm: null, accuracy: null });
    expect(metrics).toMatchObject({ avgWcpm: 40, needHelp: 0, total: 2 });
    expect(metrics.accuracy).toBeCloseTo(0.8);
  });

  it("computes mean WCPM, mean accuracy and the needs-help count", () => {
    const { metrics } = toRoster([
      child(1, "A", 45, 0.9),
      child(2, "B", 50, 0.8),
      child(3, "C", 25, 0.5),
    ]);
    expect(metrics.avgWcpm).toBe(40);
    expect(metrics.accuracy).toBeCloseTo(0.7333, 3);
    expect(metrics.needHelp).toBe(1);
  });

  it("keeps the previous reading for the trend column", () => {
    const { roster } = toRoster([child(1, "A", 42.4, 0.9, 36.6)]);
    expect(roster[0]).toMatchObject({ wcpm: 42, previousWcpm: 37, level: "Class 3" });
  });

  it("returns empty metrics for no children", () => {
    const { roster, metrics } = toRoster([]);
    expect(roster).toEqual([]);
    expect(metrics).toMatchObject({ avgWcpm: null, accuracy: null, needHelp: 0, total: 0 });
  });
});

describe("initials and readers", () => {
  it("takes initials from the first two names, script-safe", () => {
    expect(initialsOf("Meera S.")).toBe("MS");
    expect(initialsOf("Ravi")).toBe("RA");
    expect(initialsOf("ರವಿ")).toBe("ರವ");
  });

  it("turns a child into the child flow's reader", () => {
    const r = toReader({ ...child(7, "Meera S.", 40), avatar: "MS" });
    expect(r).toEqual({ id: "7", alias: "Meera S.", initials: "MS", level: "Class 3", lang: "kn-IN" });
  });
});
