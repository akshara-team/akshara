import { beforeEach, describe, expect, it } from "vitest";
import type { Attempt, Part, Reader } from "../api/types";
import {
  EMPTY_STORE,
  addReading,
  buildReading,
  clearChild,
  load,
  save,
  setLanguage,
  setReaderAndLang,
  type StoredReading,
} from "./storage";

const reader: Reader = {
  id: "aarav",
  alias: "Aarav Gowda",
  initials: "AG",
  level: "Class 3",
  lang: "kn-IN",
};

function reading(id: string, wcpm = 42): StoredReading {
  return {
    id,
    passageId: "p1",
    storyTitle: "ಬಣ್ಣದ ಚಿಟ್ಟೆ",
    language: "kn-IN",
    at: new Date().toISOString(),
    parts: 1,
    accuracy: 0.9,
    wcpm,
    seconds: 12,
    words: [],
  };
}

function attempt(words: Attempt["words"]): Attempt {
  return {
    notice: "",
    request_id: "r1",
    learner: "Aarav Gowda",
    passage_id: "p1",
    language: "kn-IN",
    provider: "fixture",
    transcript: "",
    accuracy: 1,
    wcpm: 40,
    words,
  };
}

beforeEach(() => window.localStorage.clear());

describe("storage", () => {
  it("round-trips the reader, language and readings", () => {
    setReaderAndLang(reader, "ta-IN");
    addReading(reading("a"));
    const store = load();
    expect(store.reader).toEqual(reader);
    expect(store.lang).toBe("ta-IN");
    expect(store.readings.map((r) => r.id)).toEqual(["a"]);
  });

  it("keeps only the language when no reader is chosen yet", () => {
    setLanguage("hi-IN");
    expect(load().lang).toBe("hi-IN");
    expect(load().reader).toBeNull();
  });

  it("dedupes by id and keeps the newest first", () => {
    addReading(reading("a", 30));
    addReading(reading("b", 36));
    addReading(reading("a", 42));
    const ids = load().readings.map((r) => r.id);
    expect(ids).toEqual(["a", "b"]);
    expect(load().readings[0].wcpm).toBe(42);
  });

  it("caps the history at 50 readings", () => {
    for (let i = 0; i < 55; i += 1) addReading(reading(`r${i}`));
    expect(load().readings).toHaveLength(50);
    expect(load().readings[0].id).toBe("r54");
  });

  it("falls back to empty on corrupt JSON", () => {
    window.localStorage.setItem("akshara.v1", "{not json");
    expect(load()).toEqual(EMPTY_STORE);
  });

  it("clears everything", () => {
    setReaderAndLang(reader, "kn-IN");
    addReading(reading("a"));
    clearChild();
    expect(load()).toEqual(EMPTY_STORE);
  });

  it("never throws when storage is blocked", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    expect(() => save(EMPTY_STORE)).not.toThrow();
    expect(load()).toEqual(EMPTY_STORE);
    if (original) Object.defineProperty(window, "localStorage", original);
  });
});

describe("buildReading", () => {
  const correct = { op: "correct", word: "ಒಂದು", said: "ಒಂದು", index: 0, check: false } as const;
  const skipped = { op: "skipped", word: "ಕೆಂಪು", said: null, index: 1, check: false } as const;

  it("returns null until every part has been read", () => {
    const parts: Part[] = [
      { index: 0, text: "a", attempt: attempt([correct, skipped]), seconds: 10 },
      { index: 1, text: "b", attempt: null, seconds: null },
    ];
    expect(
      buildReading({ id: "s1", passageId: "p1", storyTitle: "t", language: "kn-IN", parts }),
    ).toBeNull();
  });

  it("aggregates accuracy, WCPM and seconds across the parts", () => {
    const parts: Part[] = [
      { index: 0, text: "a", attempt: attempt([correct]), seconds: 10 },
      { index: 1, text: "b", attempt: attempt([correct, skipped]), seconds: 10 },
    ];
    const r = buildReading({
      id: "s1",
      passageId: "p1",
      storyTitle: "t",
      language: "kn-IN",
      parts,
      at: "2026-10-21T00:00:00.000Z",
    });
    expect(r).not.toBeNull();
    expect(r?.parts).toBe(2);
    expect(r?.accuracy).toBeCloseTo(2 / 3, 5);
    expect(r?.seconds).toBe(20);
    expect(r?.wcpm).toBe(6); // 2 correct in 20 s -> 6 per minute
    expect(r?.at).toBe("2026-10-21T00:00:00.000Z");
  });

  it("returns null for an empty story", () => {
    expect(
      buildReading({ id: "s", passageId: "p", storyTitle: "t", language: "kn-IN", parts: [] }),
    ).toBeNull();
  });
});
