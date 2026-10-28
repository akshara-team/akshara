import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { api } from "./api";
import { resetMockClass } from "./api/mockClass";
import { t } from "./i18n";
import { EMPTY_STORE, load, save } from "./state/storage";

// Test rows, not Evon output: one "evon" sentence for the demo child's weak letter ಳ, and one
// story sentence. The real bank (scripts/build_sentences.py) has no Evon rows until the batch runs.
vi.mock("./data/sentences.json", () => ({
  default: {
    languages: {
      "kn-IN": [
        { id: "test-evon", text: "ಅವಳು ಶಾಲೆಗೆ ಹೋದಳು", source: "evon", skill: "letter:ಳ", skills: ["letter:ಳ"] },
        { id: "test-story", text: "ಒಂದು ಪುಟ್ಟ ಚಿಟ್ಟೆ ಹಾರಿತು", source: "story", skill: null, skills: ["letter:ಟ"] },
      ],
      "hi-IN": [],
      "ta-IN": [],
    },
  },
}));

const kn = (k: Parameters<typeof t>[1], v?: Parameters<typeof t>[2]) => t("kn-IN", k, v);

function at(path: string, state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => {
  resetMockClass();
  save({ ...EMPTY_STORE });
});

describe("practice sentences: Evon writes, the teacher approves, the child reads", () => {
  it("never gives a child a sentence a teacher has not approved", async () => {
    const s = await api.sentenceFor(1);
    expect(s.source).toBe("story");
  });

  it("the teacher approves from the dashboard card, then the child gets that sentence", async () => {
    let view = at("/teacher");
    fireEvent.click(await screen.findByRole("button", { name: /read and approve/i }));
    expect(await screen.findByText("ಅವಳು ಶಾಲೆಗೆ ಹೋದಳು")).toBeTruthy();
    expect(screen.getByText(/written by evon, passed the code checks/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(await screen.findByText(/nothing waiting for you/i)).toBeTruthy();
    view.unmount();

    const s = await api.sentenceFor(1);
    expect(s).toMatchObject({ id: "test-evon", practises: "letter:ಳ", status: "approved" });

    // The child, after practising words, reads it.
    save({ ...load(), lang: "kn-IN", reader: { id: "1", alias: "Aarav Gowda", initials: "AG", level: "", lang: "kn-IN" } });
    view = at("/practice", { words: [] });
    fireEvent.click(await screen.findByRole("button", { name: kn("sentence.start") }));
    expect(await screen.findByText("ಅವಳು ಶಾಲೆಗೆ ಹೋದಳು")).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: kn("read.demoReading") }));
    });
    expect(await screen.findByText(kn("sentence.great"))).toBeTruthy();
    view.unmount();

    // Still the only sentence for ಳ, so it comes back: practising the weak sound beats variety.
    await waitFor(async () => expect((await api.sentenceFor(1)).id).toBe("test-evon"));
  });

  it("a rejected sentence is never shown", async () => {
    await api.reviewSentence("test-evon", "rejected");
    expect((await api.sentenceFor(1)).id).toBe("test-story");
    await expect(api.reviewSentence("test-story", "approved")).rejects.toMatchObject({ status: 409 });
  });

  it("a child without a teacher's record is not offered a sentence", async () => {
    save({ ...load(), reader: { id: "local-1", alias: "Guest", initials: "G", level: "", lang: "kn-IN" } });
    at("/practice", { words: [] });
    await screen.findByText(kn("practice.done", { count: 0 }));
    expect(screen.queryByRole("button", { name: kn("sentence.start") })).toBeNull();
  });
});
