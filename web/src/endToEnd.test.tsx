import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { api } from "./api";
import { resetMockClass } from "./api/mockClass";
import { t } from "./i18n";
import { EMPTY_STORE, load, save } from "./state/storage";

/**
 * WP10's end-to-end pass in mock mode, one child from start to finish: added with consent,
 * placed, reads a story, practises, the teacher reviews by ear, sees the profile, deletes.
 * The same journey through the API is tests/test_end_to_end.py.
 */

const kn = (k: Parameters<typeof t>[1], v?: Parameters<typeof t>[2]) => t("kn-IN", k, v);
const LONG = { timeout: 4000 };

function at(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => {
  resetMockClass();
  save({ ...EMPTY_STORE });
});

describe("one child, start to finish (mock mode)", () => {
  it("add with consent → placement → reading → practice → review → profile → delete", async () => {
    // 1. The teacher adds Tara, with a parent's consent.
    let view = at("/teacher/add");
    fireEvent.change(screen.getByLabelText(/child’s name/i), { target: { value: "Tara" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /parent or guardian has agreed/i }));
    fireEvent.click(screen.getByRole("button", { name: /save child/i }));
    let tara = await waitFor(async () => {
      const found = (await api.listChildren("kn-IN")).find((c) => c.alias === "Tara");
      expect(found?.consent_date).toBeTruthy();
      return found!;
    });
    view.unmount();

    // 2. Placement, marked by ear: every word right on the paragraph and the story.
    view = at(`/teacher/child/${tara.id}/placement`);
    for (let step = 0; step < 2; step++) {
      fireEvent.click(await screen.findByRole("button", { name: /mark by ear/i }));
      fireEvent.click(screen.getByRole("button", { name: /confirm and continue/i }));
    }
    await waitFor(async () => expect((await api.getChild(tara.id)).level).toBeTruthy());
    view.unmount();

    // 3. Tara reads a story on the child screens (the demo reading stands in for the mic).
    save({
      ...load(),
      lang: "kn-IN",
      reader: { id: String(tara.id), alias: "Tara", initials: "T", level: "", lang: "kn-IN" },
    });
    view = at("/home");
    fireEvent.click(await screen.findByRole("button", { name: kn("home.readStory") }));
    fireEvent.click(await screen.findByRole("button", { name: kn("read.demoReading") }));
    fireEvent.click(await screen.findByRole("button", { name: kn("feedback.next", { n: 2 }) }));
    fireEvent.click(await screen.findByRole("button", { name: kn("read.demoReading") }));
    fireEvent.click(await screen.findByRole("button", { name: kn("feedback.seeResults") }));

    // 4. She practises the words she missed.
    fireEvent.click(await screen.findByRole("button", { name: kn("practice.start") }));
    // At most three words; after each, either the next word or "all done" appears.
    for (let done = 1; done <= 3; done++) {
      fireEvent.click(await screen.findByRole("button", { name: kn("read.demoReading") }));
      fireEvent.click(await screen.findByRole("button", { name: kn("practice.next") }));
      const finished = await waitFor(() => {
        if (screen.queryByText(kn("practice.done", { count: done }))) return true;
        if (screen.queryByRole("button", { name: kn("read.demoReading") })) return false;
        throw new Error("waiting for the next word");
      });
      if (finished) break;
    }
    view.unmount();
    expect(await api.childReadings(tara.id)).toHaveLength(1);

    // 5. The teacher hears Tara's words to check, by keyboard, and marks them right.
    const queue = (await api.reviewQueue("kn-IN")).filter((i) => i.child_id === tara.id);
    expect(queue.length).toBeGreaterThan(0);
    const before = (await api.childReadings(tara.id))[0].accuracy;
    view = at("/teacher/review");
    await screen.findByText(/items? left/, undefined, LONG);
    const total = (await api.reviewQueue("kn-IN")).length;
    for (let n = 0; n < total; n++) {
      await act(async () => {
        fireEvent.keyDown(window, { key: "1" });
      });
    }
    await screen.findByText(/nothing to hear/i, undefined, LONG);
    view.unmount();
    expect((await api.childReadings(tara.id))[0].accuracy).toBeGreaterThanOrEqual(before);

    // 6. Her profile shows the reading and her level.
    view = at(`/teacher/child/${tara.id}`);
    expect(await screen.findByText(/reading history · 1 reading$/i, undefined, LONG)).toBeTruthy();
    tara = await api.getChild(tara.id);
    expect(tara.level).toBeTruthy();
    view.unmount();

    // 7. A parent takes consent back: the teacher deletes everything about her.
    view = at(`/teacher/edit/${tara.id}`);
    fireEvent.click(await screen.findByRole("button", { name: /delete tara’s data/i }));
    fireEvent.click(screen.getByRole("button", { name: /yes, delete everything/i }));
    expect(await screen.findByText(/tara and all their readings/i)).toBeTruthy();
    expect((await api.listChildren()).some((c) => c.id === tara.id)).toBe(false);
    expect((await api.reviewQueue()).some((i) => i.child_id === tara.id)).toBe(false);
    expect(load().reader).toBeNull();
  }, 20000);
});
