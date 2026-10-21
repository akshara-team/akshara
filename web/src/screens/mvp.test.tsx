import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../api";
import { App } from "../App";

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

  it("renders the roster from the class-summary API and its computed metrics", async () => {
    vi.spyOn(api, "classSummary").mockResolvedValue([
      { alias: "Meera S.", language: "kn-IN", attempts: 2, accuracy: 0.75, wcpm: 30 },
      { alias: "Kabir", language: "kn-IN", attempts: 1, accuracy: 0.95, wcpm: 45 },
    ]);
    at("/teacher");
    expect(await screen.findByText("Meera S.")).toBeTruthy();
    expect(screen.getByText("Kabir")).toBeTruthy();
    // mean WCPM (30 + 45) / 2 = 38, accuracy (0.75 + 0.95) / 2 = 85%
    expect(screen.getByText("38")).toBeTruthy();
    expect(screen.getByText("85%")).toBeTruthy();
    expect(screen.getByText("1 / 2")).toBeTruthy(); // Meera is below the band
  });

  it("falls back to the demo class when the summary API fails", async () => {
    vi.spyOn(api, "classSummary").mockRejectedValue(new Error("offline"));
    at("/teacher");
    expect(await screen.findByText("Aarav Gowda")).toBeTruthy();
    expect(screen.getByText(/3 children · latest attempts · demo data/)).toBeTruthy();
  });

  it("renders the five-column roster table on a desktop viewport", async () => {
    stubDesktopViewport();
    at("/teacher");
    expect(await screen.findByRole("columnheader", { name: /latest wcpm/i })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: /^accuracy$/i })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: /previous/i })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: /status/i })).toBeTruthy();
  });

  it("shows the teacher navigation on the desktop frames", async () => {
    stubDesktopViewport();
    at("/teacher/child/aarav");
    expect(await screen.findByRole("navigation", { name: /teacher/i })).toBeTruthy();
  });

  it("renders a child profile with history", () => {
    at("/teacher/child/aarav");
    expect(screen.getByText(/reading history/i)).toBeTruthy();
    expect(screen.getByText(/band:/i)).toBeTruthy();
  });

  it("renders attempt details with the calculation spelled out", () => {
    at("/teacher/attempt/aarav");
    expect(screen.getByText(/reference words/i)).toBeTruthy();
    expect(screen.getByText(/accuracy =/i)).toBeTruthy();
  });

  it("renders the add-child form with its validation message", () => {
    at("/teacher/add");
    expect(screen.getByText(/add a child/i)).toBeTruthy();
    expect(screen.getByText(/add a name before saving/i)).toBeTruthy();
  });

  it("renders the story picker", () => {
    at("/teacher/story");
    expect(screen.getByText(/pick a language and level/i)).toBeTruthy();
  });

  it("renders a recovery screen with its steps", () => {
    at("/recovery/microphone");
    expect(screen.getByText(/we need the microphone/i)).toBeTruthy();
    expect(screen.getByText(/choose permissions/i)).toBeTruthy();
  });

  it("falls back to the service-error recovery for an unknown kind", () => {
    at("/recovery/nonsense");
    expect(screen.getByText(/something got mixed up/i)).toBeTruthy();
  });
});
