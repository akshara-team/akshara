import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { t } from "./i18n";

describe("App", () => {
  it("renders the role selection screen with its real copy", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: t("kn-IN", "reader.title") })).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: /reading language/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /i am the teacher/i })).toBeTruthy();
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
