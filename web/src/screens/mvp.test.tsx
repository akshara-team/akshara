import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../api";
import { resetMockClass } from "../api/mockClass";
import { App } from "../App";
import { t } from "../i18n";

function at(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetMockClass();
});

/** Pretend the viewport is the design's desktop size. */
function stubDesktopViewport() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

describe("MVP routes", () => {
  it("renders the teacher dashboard with the class roster", async () => {
    at("/teacher");
    expect(await screen.findByText("Aarav Gowda")).toBeTruthy();
    expect(screen.getByText(/your reading class/i)).toBeTruthy();
    expect(screen.getByText("Rohan M.")).toBeTruthy();
  });

  it("renders the roster from the children API and its computed metrics", async () => {
    const kid = (id: number, alias: string, accuracy: number, wcpm: number) => ({
      id, alias, language: "kn-IN" as const, grade: 3, avatar: null, created_at: 0,
      readings: 1, latest: { at: 1, accuracy, wcpm }, previous: null,
    }); // prettier-ignore
    vi.spyOn(api, "listChildren").mockResolvedValue([
      kid(1, "Meera S.", 0.75, 25),
      kid(2, "Kabir", 0.95, 51),
    ]);
    at("/teacher");
    expect(await screen.findByText("Meera S.")).toBeTruthy();
    expect(screen.getByText("Kabir")).toBeTruthy();
    // mean WCPM (25 + 51) / 2 = 38, accuracy (0.75 + 0.95) / 2 = 85%
    expect(screen.getByText("38")).toBeTruthy();
    expect(screen.getByText("85%")).toBeTruthy();
    expect(screen.getByText("1 of 2")).toBeTruthy(); // Meera is below the goal
  });

  it("says so when the class cannot be loaded", async () => {
    vi.spyOn(api, "listChildren").mockRejectedValue(new Error("offline"));
    at("/teacher");
    expect(await screen.findByText(/could not load the class/i)).toBeTruthy();
  });

  it("offers to add a child when a language has none", async () => {
    vi.spyOn(api, "listChildren").mockResolvedValue([]);
    at("/teacher");
    expect(await screen.findByText(/no children yet/i)).toBeTruthy();
  });

  it("renders the roster table on a desktop viewport", async () => {
    stubDesktopViewport();
    at("/teacher");
    expect(await screen.findByRole("columnheader", { name: /latest wcpm/i })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: /^accuracy$/i })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: /previous/i })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: /status/i })).toBeTruthy();
  });

  it("shows the teacher navigation on the desktop frames", async () => {
    stubDesktopViewport();
    at("/teacher/child/1");
    expect(await screen.findByRole("navigation", { name: /teacher/i })).toBeTruthy();
  });

  it("renders a child profile with history", async () => {
    at("/teacher/child/1");
    expect(await screen.findByText(/reading history · 3 readings/i)).toBeTruthy();
    expect(screen.getByText(/end-of-grade-3 goal/i)).toBeTruthy();
  });

  it("renders a reading with the calculation spelled out", async () => {
    at("/teacher/child/1/reading/seed-1-2026-10-19");
    expect(await screen.findByText(/words in the story/i)).toBeTruthy();
    expect(screen.getByText(/accuracy = 18 ÷ 20/i)).toBeTruthy();
    expect(screen.getByText(/practise next/i)).toBeTruthy();
  });

  it("checks the name only when saving", async () => {
    at("/teacher/add");
    expect(screen.getByRole("heading", { name: /add a child/i })).toBeTruthy();
    expect(screen.queryByText(/add a name before saving/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /save child/i }));
    expect(await screen.findByText(/add a name before saving/i)).toBeTruthy();
  });

  it("never sends a retry to a page that does not exist", () => {
    at("/recovery/microphone");
    fireEvent.click(screen.getByRole("button", { name: t("kn-IN", "recovery.microphone.primary") }));
    expect(screen.queryByText(/nothing here/i)).toBeNull();
  });

  it("falls back to the service-error recovery for an unknown kind", () => {
    at("/recovery/nonsense");
    expect(screen.getByText(t("kn-IN", "recovery.service.title"))).toBeTruthy();
  });
});
