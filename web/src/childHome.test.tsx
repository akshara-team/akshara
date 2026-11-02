import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import type { Reader } from "./api/types";
import { App } from "./App";
import { addReading, setReaderAndLang, type StoredReading } from "./state/storage";

import { t } from "./i18n";

const kn = (k: Parameters<typeof t>[1], v?: Parameters<typeof t>[2]) => t("kn-IN", k, v);

const reader: Reader = {
  id: "1",
  alias: "Aarav Gowda",
  initials: "AG",
  level: "Class 3",
  lang: "kn-IN",
};

function reading(id: string, wcpm: number): StoredReading {
  return {
    id,
    passageId: "kn-101",
    storyTitle: "ಬಣ್ಣದ ಚಿಟ್ಟೆ",
    language: "kn-IN",
    at: "2026-10-19T00:00:00.000Z",
    parts: 2,
    accuracy: 0.9,
    wcpm,
    seconds: 25,
    words: [
      { op: "correct", word: "ಒಂದು", said: "ಒಂದು", index: 0, check: false },
      { op: "substituted", word: "ಹಾರುತ್ತಿತ್ತು", said: "ಓಡುತ್ತಿತ್ತು", index: 1, check: false },
    ],
  };
}

function at(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => window.localStorage.clear());

describe("child home", () => {
  it("sends a returning child straight home from /", () => {
    setReaderAndLang(reader, "kn-IN");
    at("/");
    expect(screen.getByText(kn("home.welcomeBack", { name: "Aarav" }))).toBeTruthy();
  });

  it("asks again for a name the class no longer has", async () => {
    setReaderAndLang({ ...reader, id: "aarav" }, "kn-IN"); // an old demo reader
    at("/home");
    expect(await screen.findByText(kn("home.findName"))).toBeTruthy();
  });

  it("asks again when the child was removed from the class", async () => {
    setReaderAndLang({ ...reader, id: "999" }, "kn-IN");
    at("/home");
    expect(await screen.findByText(kn("home.findName"))).toBeTruthy();
  });

  it("shows role selection when no child is saved", () => {
    at("/");
    expect(screen.getByRole("heading", { name: kn("reader.title") })).toBeTruthy();
  });

  it("shows saved progress: a finished story's kolam and a star per reading, no speeds", () => {
    setReaderAndLang(reader, "kn-IN");
    addReading(reading("a", 30));
    addReading(reading("b", 36));
    addReading(reading("c", 42));
    const { container } = at("/home");

    expect(screen.getByText(kn("home.welcomeBack", { name: "Aarav" }))).toBeTruthy();
    // three readings of one story -> one finished kolam, three stars
    expect(screen.getAllByRole("img", { name: "ಬಣ್ಣದ ಚಿಟ್ಟೆ" })).toHaveLength(1);
    expect(screen.getByLabelText(`${kn("rewards.stars")}: 3`)).toBeTruthy();
    expect(container.textContent).not.toMatch(/\d+\s*%|wcpm/i);
  });

  it("shows an empty state for a new reader", () => {
    setReaderAndLang(reader, "kn-IN");
    at("/home");
    expect(screen.getByText(kn("home.firstStory"))).toBeTruthy();
  });

  it("finishes to the home screen, not role selection", async () => {
    setReaderAndLang(reader, "kn-IN");
    at("/results");
    fireEvent.click(screen.getByRole("button", { name: kn("results.finish") }));
    expect(await screen.findByText(kn("home.welcomeBack", { name: "Aarav" }))).toBeTruthy();
  });
});
