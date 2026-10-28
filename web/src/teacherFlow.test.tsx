import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { api } from "./api";
import { resetMockClass } from "./api/mockClass";

function at(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => resetMockClass());

describe("teacher and child share one class (mock mode)", () => {
  it("a child the teacher adds can read, and the reading reaches their profile", async () => {
    const child = await api.addChild({ alias: "Meena K", language: "kn-IN", grade: 2, consent_date: "2026-10-01" });

    const picker = at("/reader");
    expect(await screen.findByText("Meena K")).toBeTruthy();
    picker.unmount();

    const audio = new Blob([], { type: "audio/wav" });
    for (const partIndex of [0, 1]) {
      await api.submitAttempt({
        audio, learner: "Meena K", childId: child.id, session: "s1",
        passageId: "kn-101", lang: "kn-IN", partIndex,
      }); // prettier-ignore
    }
    // a second try at part 1 replaces the first in the same reading
    await api.submitAttempt({
      audio, learner: "Meena K", childId: child.id, session: "s1",
      passageId: "kn-101", lang: "kn-IN", partIndex: 1,
    }); // prettier-ignore

    const readings = await api.childReadings(child.id);
    expect(readings).toHaveLength(1);
    expect(readings[0]).toMatchObject({ parts: [0, 1], total: 20, correct: 18 });

    at(`/teacher/child/${child.id}`);
    expect(await screen.findByText(/reading history · 1 reading$/i)).toBeTruthy();
  });

  it("keeps the class after a reload", async () => {
    await api.addChild({ alias: "Saved Kid", language: "ta-IN", grade: 1, consent_date: "2026-10-01" });
    const raw = localStorage.getItem("akshara.mockclass.v1") ?? "";
    expect(raw).toContain("Saved Kid");
  });

  it("refuses a second child with the same name", async () => {
    await expect(
      api.addChild({ alias: "Aarav Gowda", language: "kn-IN", grade: 3, consent_date: "2026-10-01" }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
