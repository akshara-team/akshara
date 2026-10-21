import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "../App";

function at(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("MVP routes", () => {
  it("renders the teacher dashboard with the class roster", () => {
    at("/teacher");
    expect(screen.getByText(/your reading class/i)).toBeTruthy();
    expect(screen.getByText("Aarav Gowda")).toBeTruthy();
    expect(screen.getByText("Rohan M.")).toBeTruthy();
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
