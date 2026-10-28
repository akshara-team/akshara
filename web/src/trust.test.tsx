import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { api } from "./api";
import { resetMockClass } from "./api/mockClass";
import reliability from "./data/reliability.json";
import { today } from "./screens/teacher/ChildForm";
import { load, save, EMPTY_STORE } from "./state/storage";

function at(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const settle = () => act(async () => new Promise((r) => setTimeout(r, 0)));

afterEach(() => {
  resetMockClass();
  save({ ...EMPTY_STORE });
});

describe("parent consent (WP7)", () => {
  it("will not add a child until a parent's consent is ticked", async () => {
    at("/teacher/add");
    fireEvent.change(screen.getByLabelText(/child’s name/i), { target: { value: "Nila" } });
    fireEvent.click(screen.getByRole("button", { name: /save child/i }));
    expect(await screen.findByText(/a parent or guardian must agree/i)).toBeTruthy();
    expect((await api.listChildren()).map((c) => c.alias)).not.toContain("Nila");

    fireEvent.click(screen.getByRole("checkbox", { name: /parent or guardian has agreed/i }));
    expect((screen.getByLabelText(/date they agreed/i) as HTMLInputElement).value).toBe(today());
    fireEvent.click(screen.getByRole("button", { name: /save child/i }));
    await waitFor(async () => {
      const nila = (await api.listChildren()).find((c) => c.alias === "Nila");
      expect(nila?.consent_date).toBe(today());
    });
  });

  it("refuses a consent date in the future", async () => {
    at("/teacher/add");
    fireEvent.change(screen.getByLabelText(/child’s name/i), { target: { value: "Nila" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /parent or guardian has agreed/i }));
    fireEvent.change(screen.getByLabelText(/date they agreed/i), { target: { value: "2999-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: /save child/i }));
    expect(await screen.findByText(/cannot be in the future/i)).toBeTruthy();
  });

  it("the mock class needs a consent date, like the API", async () => {
    await expect(api.addChild({ alias: "Nila", language: "kn-IN", grade: 2 })).rejects.toMatchObject({
      status: 422,
    });
  });

  it("consent can be re-dated but not untick when editing", async () => {
    at("/teacher/edit/2");
    const box = (await screen.findByRole("checkbox", {
      name: /parent or guardian has agreed/i,
    })) as HTMLInputElement;
    expect(box.checked).toBe(true);
    expect(box.disabled).toBe(true);
    expect(screen.getByText(/delete this child’s data below/i)).toBeTruthy();
  });
});

describe("delete this child's data (WP7)", () => {
  it("asks once in the page, deletes everything and says so", async () => {
    const before = await api.childReadings(1);
    expect(before.length).toBeGreaterThan(0);
    save({
      ...load(),
      reader: { id: "1", alias: "Aarav Gowda", initials: "AG", level: "", lang: "kn-IN" },
    });

    at("/teacher/edit/1");
    fireEvent.click(await screen.findByRole("button", { name: /delete aarav gowda’s data/i }));
    const yes = screen.getByRole("button", { name: /yes, delete everything/i });
    expect(document.activeElement).toBe(yes);
    fireEvent.click(yes);

    expect(await screen.findByText(/aarav gowda and all their readings/i)).toBeTruthy();
    expect((await api.listChildren()).map((c) => c.id)).not.toContain(1);
    await expect(api.getChild(1)).rejects.toMatchObject({ status: 404 });
    await expect(api.childReadings(1)).rejects.toMatchObject({ status: 404 });
    expect((await api.reviewQueue()).some((i) => i.child_id === 1)).toBe(false);
    expect(load().reader).toBeNull(); // this device forgets them too
  });

  it("keeps the data when the teacher changes their mind", async () => {
    at("/teacher/edit/2");
    fireEvent.click(await screen.findByRole("button", { name: /delete diya k\.’s data/i }));
    fireEvent.click(screen.getByRole("button", { name: /keep diya k\.’s data/i }));
    expect((await api.getChild(2)).alias).toBe("Diya K.");
  });

  it("is not offered when adding a child", () => {
    at("/teacher/add");
    expect(screen.queryByText(/delete this child’s data$/i)).toBeNull();
  });
});

describe("how reliable is this? (WP7)", () => {
  it("shows the saved study numbers, not numbers typed into the page", async () => {
    at("/teacher/reliability");
    await settle();
    expect(screen.getByRole("heading", { name: /how reliable is this/i })).toBeTruthy();
    const caught = within(screen.getByRole("region", { name: /mistakes caught/i }));
    const skip = reliability.languages["hi-IN"].mistakes.skip;
    const row = caught.getByRole("row", { name: /a word skipped/i });
    expect(within(row).getByText(`${skip.k} of ${skip.n}`)).toBeTruthy();
    // the weak spot is named, not hidden
    const near = caught.getByRole("row", { name: /one sound in a word changed/i });
    expect(within(near).getByText(/often missed/i)).toBeTruthy();
    expect(screen.getByText(/no children yet/i)).toBeTruthy();
    expect(screen.getByText(/no teacher comparison yet/i)).toBeTruthy();
  });
});

describe("teacher navigation", () => {
  it("offers Review and Reliability on every teacher screen", async () => {
    for (const path of ["/teacher", "/teacher/story", "/teacher/add", "/teacher/child/1"]) {
      const { unmount } = at(path);
      await settle();
      const nav = screen.getByRole("navigation", { name: /teacher/i });
      expect(within(nav).getByRole("link", { name: "Review" })).toBeTruthy();
      expect(within(nav).getByRole("link", { name: "Reliability" })).toBeTruthy();
      unmount();
    }
  });
});
