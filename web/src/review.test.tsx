import { act, fireEvent, render, screen } from "@testing-library/react";
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

const left = () => Number(/(\d+) items? left/.exec(screen.getByRole("status").textContent ?? "")?.[1]);

describe("review queue (mock mode)", () => {
  it("is cleared by keyboard alone, and the marks change the readings", async () => {
    const before = (await api.childReadings(1))[0];
    const queued = await api.reviewQueue("kn-IN");
    expect(queued.length).toBeGreaterThanOrEqual(5);

    at("/teacher/review");
    expect(await screen.findByText(/items? left/)).toBeTruthy();
    expect(left()).toBe(queued.length);

    for (let n = queued.length; n > 0; n--) {
      await act(async () => {
        fireEvent.keyDown(window, { key: "1" });
      });
    }
    // generous: under a full parallel run the last re-render can take over a second
    expect(await screen.findByText(/nothing to hear/i, undefined, { timeout: 4000 })).toBeTruthy();
    expect(await api.reviewQueue("kn-IN")).toEqual([]);

    const after = (await api.childReadings(1))[0];
    expect(after.accuracy).toBeGreaterThan(before.accuracy);
  });

  it("leaves an item for later with the arrow key", async () => {
    at("/teacher/review");
    await screen.findByText(/items? left/);
    const first = screen.getByText(/the only slip|a slip/).textContent;
    const word = document.querySelector(".review-word")?.textContent;
    await act(async () => {
      fireEvent.keyDown(window, { key: "ArrowRight" });
    });
    expect(document.querySelector(".review-word")?.textContent).not.toBe(word);
    expect(first).toBeTruthy();
  });

  it("says when there is nothing to hear", async () => {
    at("/teacher/review");
    await screen.findByText(/items? left/);
    fireEvent.change(screen.getByLabelText(/language/i), { target: { value: "hi-IN" } });
    expect(await screen.findByText(/nothing to hear/i)).toBeTruthy();
  });
});
