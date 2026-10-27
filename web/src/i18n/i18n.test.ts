import { describe, expect, it } from "vitest";
import { LANGUAGE_FILES, fill, lookup, placeholders } from "./index";

const en = LANGUAGE_FILES.en as Record<string, string>;

describe("language files", () => {
  for (const [name, file] of Object.entries(LANGUAGE_FILES)) {
    if (name === "en") continue;
    const table = file as Record<string, string>;

    it(`${name}.json has exactly the keys of en.json`, () => {
      expect(Object.keys(table).filter((k) => !(k in en))).toEqual([]); // no stray keys
      expect(Object.keys(en).filter((k) => !table[k]?.trim())).toEqual([]); // nothing missing
    });

    it(`${name}.json keeps every {placeholder}`, () => {
      const wrong = Object.keys(en).filter(
        (k) => table[k] && placeholders(table[k]).join() !== placeholders(en[k]).join(),
      );
      expect(wrong).toEqual([]);
    });

    it(`${name}.json has no English words left in`, () => {
      const latin = Object.entries(table).filter(([, v]) =>
        /[A-Za-z]{3,}/.test(v.replace(/\{\w+\}/g, "")),
      );
      expect(latin.map(([k]) => k)).toEqual([]);
    });
  }
});

describe("lookup", () => {
  it("fills placeholders and leaves unknown ones visible", () => {
    expect(fill("Part {n} of {total}", { n: 1, total: 2 })).toBe("Part 1 of 2");
    expect(fill("Hi {name}", {})).toBe("Hi {name}");
  });

  it("returns native text tagged with its language", () => {
    expect(lookup("kn-IN", "home.readStory")).toEqual({ text: "ಕಥೆ ಓದು", lang: "kn-IN" });
  });
});
