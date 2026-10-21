import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import type { Reader } from "./api/types";
import { App } from "./App";
import { setReaderAndLang } from "./state/storage";

const reader: Reader = {
  id: "aarav",
  alias: "Aarav Gowda",
  initials: "AG",
  level: "Class 3",
  lang: "kn-IN",
};

function at(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => window.localStorage.clear());

describe("page header", () => {
  it("links the logo to the child home", () => {
    setReaderAndLang(reader, "kn-IN");
    at("/home");
    const logo = screen.getByRole("link", { name: /akshara home/i });
    expect(logo.getAttribute("href")).toBe("/home");
  });

  it("links the logo to role selection when no reader is saved", () => {
    at("/switch");
    expect(screen.getByRole("link", { name: /akshara home/i }).getAttribute("href")).toBe(
      "/switch",
    );
  });

  it("offers the account menu on child screens", () => {
    setReaderAndLang(reader, "kn-IN");
    const { container } = at("/home");
    expect(container.querySelector('[aria-label="My account"]')).toBeTruthy();
    expect(screen.getByText("Switch reader").closest("a")?.getAttribute("href")).toBe("/switch");
    expect(screen.getByText("Teacher view").closest("a")?.getAttribute("href")).toBe("/teacher");
  });

  it("gives the back link a label instead of a bare arrow", () => {
    setReaderAndLang(reader, "kn-IN");
    at("/read/kn-101");
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/home");
  });

  it("sets the document title per route", () => {
    at("/teacher");
    expect(document.title).toBe("Class · Akshara");
  });
});
