import { describe, expect, it } from "vitest";
import { bestStreak, currentStreak, localDay, starCount } from "./rewards";
import type { StoredReading } from "./storage";

/** A finished reading at a local time (no zone, so the test is timezone-safe). */
function reading(at: string, id = at): StoredReading {
  return {
    id,
    passageId: "sw-1",
    storyTitle: "The cat",
    language: "kn-IN",
    at,
    parts: 1,
    accuracy: 1,
    wcpm: 40,
    seconds: 30,
    words: [],
  };
}

describe("localDay", () => {
  it("buckets by the local calendar day", () => {
    expect(localDay("2026-10-29T00:01:00")).toBe("2026-10-29");
    expect(localDay("2026-10-29T23:59:00")).toBe("2026-10-29");
    // One minute past local midnight is the next day.
    expect(localDay("2026-10-30T00:01:00")).toBe("2026-10-30");
  });
});

describe("starCount", () => {
  it("gives one star per finished story, and none for an empty history", () => {
    expect(starCount([])).toBe(0);
    expect(starCount([reading("2026-10-29T09:00:00", "a")])).toBe(1);
    expect(
      starCount([
        reading("2026-10-29T09:00:00", "a"),
        reading("2026-10-29T15:00:00", "b"),
        reading("2026-10-28T09:00:00", "c"),
      ]),
    ).toBe(3);
  });
});

describe("currentStreak", () => {
  const now = new Date(2026, 9, 29, 12, 0, 0); // 29 Oct 2026, local noon

  it("is zero with no readings", () => {
    expect(currentStreak([], now)).toBe(0);
  });

  it("counts consecutive days up to today", () => {
    const days = [
      reading("2026-10-29T09:00:00", "29"),
      reading("2026-10-28T09:00:00", "28"),
      reading("2026-10-27T09:00:00", "27"),
    ];
    expect(currentStreak(days, now)).toBe(3);
  });

  it("counts a day with two readings only once", () => {
    const days = [
      reading("2026-10-29T09:00:00", "29a"),
      reading("2026-10-29T18:00:00", "29b"),
      reading("2026-10-28T09:00:00", "28"),
    ];
    expect(currentStreak(days, now)).toBe(2);
  });

  it("keeps a run alive when the last reading was yesterday", () => {
    const days = [
      reading("2026-10-28T09:00:00", "28"),
      reading("2026-10-27T09:00:00", "27"),
      reading("2026-10-26T09:00:00", "26"),
    ];
    expect(currentStreak(days, now)).toBe(3);
  });

  it("is over when the last reading was two days ago", () => {
    expect(currentStreak([reading("2026-10-27T09:00:00", "27")], now)).toBe(0);
  });

  it("stops at a gap", () => {
    const days = [
      reading("2026-10-29T09:00:00", "29"),
      reading("2026-10-28T09:00:00", "28"),
      // no 27th
      reading("2026-10-26T09:00:00", "26"),
      reading("2026-10-25T09:00:00", "25"),
    ];
    expect(currentStreak(days, now)).toBe(2);
  });
});

describe("bestStreak", () => {
  it("is zero with no readings", () => {
    expect(bestStreak([])).toBe(0);
  });

  it("finds the longest run, even one that is over", () => {
    const days = [
      reading("2026-10-29T09:00:00", "29"),
      // gap on the 28th
      reading("2026-10-27T09:00:00", "27"),
      reading("2026-10-26T09:00:00", "26"),
      reading("2026-10-25T09:00:00", "25"),
      reading("2026-10-24T09:00:00", "24"),
    ];
    expect(bestStreak(days)).toBe(4);
    expect(currentStreak(days, new Date(2026, 9, 29, 12, 0, 0))).toBe(1);
  });
});
