import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { api, storyFor } from "./api";
import { resetMockClass } from "./api/mockClass";
import { replay } from "./api/placement";
import type { MarkState } from "./api/types";

function at(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => resetMockClass());

const all = (s: MarkState, n: number): MarkState[] => Array(n).fill(s);

describe("placement rules (same cases as tests/test_tutor.py)", () => {
  it("follows the ASER tree", () => {
    expect(replay([all("correct", 10), all("correct", 20)]).level).toBe("story");
    expect(replay([all("error", 10), all("correct", 5)])).toMatchObject({
      level: "word",
      uncertain: false,
    });
    expect(replay([all("error", 10)]).task).toBe("words");
    expect(replay([all("error", 10), all("error", 5), all("error", 5)]).level).toBe("beginner");
  });

  it("asks one more item when unsure marks decide, then counts them half", () => {
    const half: MarkState[] = ["correct", "correct", "correct", "unsure", "unsure"];
    const open = replay([all("error", 10), half]);
    expect(open.task).toBe("words");
    expect(open.outcomes).toEqual(["fail", "open"]);
    const after = replay([all("error", 10), half, half]);
    expect(after.uncertain).toBe(true);
    expect(after.level).toBe("word"); // 6 right + 4 unsure at half = 8 of 10, the 80% bar
  });
});

describe("placement in the app (mock mode)", () => {
  it("places a child by ear and shows the level on their profile", async () => {
    at("/teacher/child/1/placement");
    // paragraph: mark by ear, then mark every word wrong
    fireEvent.click(await screen.findByRole("button", { name: /mark by ear/i }));
    for (const chip of screen.getAllByRole("button", { name: /tap to change/i })) {
      fireEvent.click(chip);
    }
    fireEvent.click(screen.getByRole("button", { name: /confirm and continue/i }));
    // words: try recording first
    expect(await screen.findByText(/step 2 · words/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /record the child reading/i }));
    // jsdom has no microphone: the screen says so and offers marking by ear
    expect(await screen.findByText(/microphone is not available/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /mark by ear/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm and continue/i }));
    expect(await screen.findByText(/reads words, not yet a paragraph/i)).toBeTruthy();

    const child = await api.getChild(1);
    expect(child.level).toBe("word");
  });

  it("counts every mark when the teacher taps several quickly", async () => {
    at("/teacher/child/1/placement");
    fireEvent.click(await screen.findByRole("button", { name: /mark by ear/i }));
    const chips = screen.getAllByRole("button", { name: /tap to change/i });
    // three taps inside one React update: each must build on the one before
    act(() => chips.slice(0, 3).forEach((c) => c.click()));
    expect(screen.getByText(new RegExp(`${chips.length - 3} of ${chips.length} right`))).toBeTruthy();
  });
});

describe("which story a child reads", () => {
  it("prefers the teacher's choice, then the learner model's pick", async () => {
    expect((await storyFor("kn-IN", 1, "kn-777"))?.id).toBe("kn-777");
    expect((await storyFor("kn-IN", 1))?.id).toBe("kn-101");
    expect((await storyFor("kn-IN", undefined))?.id).toBe("kn-101");
  });
});
