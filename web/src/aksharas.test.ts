import { describe, expect, it } from "vitest";
import { graphemes } from "./api";

describe("akshara split (demo mode, same rule as the backend)", () => {
  it("keeps Kannada conjuncts together", () => {
    expect(graphemes("ಹಾರುತ್ತಿತ್ತು", "kn-IN")).toEqual(["ಹಾ", "ರು", "ತ್ತಿ", "ತ್ತು"]);
  });
  it("keeps Hindi conjuncts together", () => {
    expect(graphemes("बच्चा", "hi-IN")).toEqual(["ब", "च्चा"]);
  });
  it("leaves Tamil clusters apart, except க்ஷ", () => {
    expect(graphemes("பக்கம்", "ta-IN")).toEqual(["ப", "க்", "க", "ம்"]);
    expect(graphemes("க்ஷ", "ta-IN")).toEqual(["க்ஷ"]);
  });
});
