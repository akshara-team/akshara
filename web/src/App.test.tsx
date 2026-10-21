import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the role selection screen with its real copy", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText(/a little reading/i)).toBeTruthy();
    expect(screen.getByText(/pick your language/i)).toBeTruthy();
    expect(screen.getByText(/who are you\?/i)).toBeTruthy();
  });

  it("shows a not-found screen for an unknown route", () => {
    render(
      <MemoryRouter initialEntries={["/nope"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText(/nothing here/i)).toBeTruthy();
  });
});
