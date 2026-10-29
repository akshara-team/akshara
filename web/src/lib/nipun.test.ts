import { describe, expect, it } from "vitest";
import { LANGS } from "../theme/script";
import { nipunBand } from "./nipun";

describe("nipunBand", () => {
  it("places a reading in the four FLS 2022 levels, per language", () => {
    // Hindi: 0-16 | 17-34 | 35-54 | 55+
    expect(nipunBand("hi-IN", 3, 16)?.level).toBe("below");
    expect(nipunBand("hi-IN", 3, 17)?.level).toBe("partially");
    expect(nipunBand("hi-IN", 3, 35)?.level).toBe("meets");
    expect(nipunBand("hi-IN", 3, 55)?.level).toBe("exceeds");

    // Kannada: 0-13 | 14-29 | 30-48 | 49+
    expect(nipunBand("kn-IN", 3, 13)?.level).toBe("below");
    expect(nipunBand("kn-IN", 3, 14)?.level).toBe("partially");
    expect(nipunBand("kn-IN", 3, 30)?.level).toBe("meets");
    expect(nipunBand("kn-IN", 3, 49)?.level).toBe("exceeds");

    // Tamil: 0-8 | 9-27 | 28-49 | 50+
    expect(nipunBand("ta-IN", 3, 8)?.level).toBe("below");
    expect(nipunBand("ta-IN", 3, 9)?.level).toBe("partially");
    expect(nipunBand("ta-IN", 3, 28)?.level).toBe("meets");
    expect(nipunBand("ta-IN", 3, 50)?.level).toBe("exceeds");
  });

  it("reports the goal band (Meets) for each language", () => {
    expect(nipunBand("hi-IN", 3, 40)?.goal).toEqual({ low: 35, high: 54 });
    expect(nipunBand("kn-IN", 3, 40)?.goal).toEqual({ low: 30, high: 48 });
    expect(nipunBand("ta-IN", 3, 40)?.goal).toEqual({ low: 28, high: 49 });
  });

  it("cut-offs rise from Below to Exceeds in every language", () => {
    for (const lang of LANGS) {
      const band = (wcpm: number) => nipunBand(lang, 3, wcpm)!;
      const belowMax = band(0).max!;
      const partialMax = band(belowMax + 1).max!;
      const meetsMax = band(partialMax + 1).max!;

      expect(belowMax).toBeLessThan(partialMax);
      expect(partialMax).toBeLessThan(meetsMax);

      expect(band(belowMax).level).toBe("below");
      expect(band(belowMax + 1).level).toBe("partially");
      expect(band(partialMax).level).toBe("partially");
      expect(band(partialMax + 1).level).toBe("meets");
      expect(band(meetsMax).level).toBe("meets");
      expect(band(meetsMax + 1).level).toBe("exceeds");
      expect(band(meetsMax + 1).max).toBeNull();
    }
  });

  it("has no band outside Grade 3", () => {
    for (const lang of LANGS) {
      for (const grade of [0, 1, 2, 4, 5]) {
        expect(nipunBand(lang, grade, 40)).toBeNull();
      }
    }
  });

  it("returns null when the reading is not a finite number", () => {
    expect(nipunBand("kn-IN", 3, Number.NaN)).toBeNull();
    expect(nipunBand("kn-IN", 3, Number.POSITIVE_INFINITY)).toBeNull();
  });
});
