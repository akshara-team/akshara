import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { LANGUAGE_FILES, t } from "./i18n";
import { EMPTY_STORE, save } from "./state/storage";

// Timbre's endpoint takes at most 60 characters (MAX_WORD_CHARS in src/akshara/api/app.py);
// a longer line would fall back to the device voice.
const TIMBRE_MAX = 60;

describe("spoken instructions (WP6)", () => {
  afterEach(() => {
    save({ ...EMPTY_STORE });
    vi.unstubAllGlobals();
  });

  for (const [name, table] of Object.entries(LANGUAGE_FILES)) {
    it(`every spoken line in ${name}.json fits one Timbre clip`, () => {
      const long = Object.entries(table as Record<string, string>)
        .filter(([k]) => k.startsWith("say.") && k !== "say.label")
        .filter(([, v]) => v.length > TIMBRE_MAX);
      expect(long).toEqual([]);
    });
  }

  it("says the instruction in the child's language when the speaker is tapped", async () => {
    const spoken: { text: string; lang: string }[] = [];
    class Utterance {
      lang = "";
      constructor(public text: string) {}
    }
    vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
    vi.stubGlobal("speechSynthesis", {
      cancel: () => {},
      speak: (u: Utterance) => spoken.push({ text: u.text, lang: u.lang }),
    });
    save({ ...EMPTY_STORE, lang: "ta-IN", reader: { id: "4", alias: "Kavin S.", initials: "KS", level: "", lang: "ta-IN" } });
    render(
      <MemoryRouter initialEntries={["/home"]}>
        <App />
      </MemoryRouter>,
    );
    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: t("ta-IN", "say.label") }));
    });
    expect(spoken).toEqual([{ text: t("ta-IN", "say.home"), lang: "ta-IN" }]);
  });
});
