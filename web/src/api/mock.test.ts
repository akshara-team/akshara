import { describe, expect, it } from "vitest";
import { MOCK_DURATIONS, mockAttempt } from "./mock";

/**
 * The mock fixtures reproduce the Figma handoff's demo attempt
 * ("Measurement specifications" 2:41877): 20 reference words, 18 correct,
 * 1 substitution, 1 skipped, two parts of 14.3 s + 11.4 s, 42 WCPM, 90%.
 */
function allWords() {
  return [0, 1].flatMap((i) => mockAttempt("kn-101", "kn-IN", i).words);
}

describe("mock fixtures", () => {
  it("part 1 matches the design (9 words, 8 correct, 1 substitution)", () => {
    const a = mockAttempt("kn-101", "kn-IN", 0);
    expect(a.words).toHaveLength(9);
    expect(a.words.filter((w) => w.op === "correct")).toHaveLength(8);
    expect(a.words.find((w) => w.op === "substituted")?.word).toBe("ಹಾರುತ್ತಿತ್ತು");
  });

  it("the two parts total 20 words: 18 correct, 1 swap, 1 skip", () => {
    const words = allWords();
    expect(words).toHaveLength(20);
    expect(words.filter((w) => w.op === "correct")).toHaveLength(18);
    expect(words.filter((w) => w.op === "substituted")).toHaveLength(1);
    expect(words.filter((w) => w.op === "skipped")).toHaveLength(1);
  });

  it("reproduces the design's 90% accuracy and 42 WCPM", () => {
    const words = allWords();
    const correct = words.filter((w) => w.op === "correct").length;
    const seconds = MOCK_DURATIONS.reduce((a, b) => a + b, 0);
    expect(correct / words.length).toBeCloseTo(0.9, 5);
    expect(Math.round((correct / seconds) * 60)).toBe(42);
  });

  it("flags exactly one word as a spelling-variant check", () => {
    expect(allWords().filter((w) => w.check)).toHaveLength(1);
  });
});
