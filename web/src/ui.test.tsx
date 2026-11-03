import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import type { Reader } from "./api/types";
import { App } from "./App";
import { setReaderAndLang } from "./state/storage";
import { t } from "./i18n";

const reader: Reader = {
  id: "1",
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
    at("/teacher");
    const logo = screen.getByRole("link", { name: /akshara home/i });
    expect(logo.getAttribute("href")).toBe("/home");
  });

  it("links the logo to role selection when no reader is saved", () => {
    at("/teacher");
    expect(screen.getByRole("link", { name: /akshara home/i }).getAttribute("href")).toBe(
      "/switch",
    );
  });

  it("lets a child tap their own picture to go back to who is reading", () => {
    setReaderAndLang(reader, "kn-IN");
    at("/home");
    const mark = screen.getByRole("link", { name: t("kn-IN", "home.notMe") });
    expect(mark.getAttribute("href")).toBe("/switch");
  });

  it("gives the back link a label instead of a bare arrow", () => {
    const { container } = at("/teacher/story");
    const back = container.querySelector(".page-header__back");
    expect(back?.textContent).toBe("Class");
    expect(back?.getAttribute("href")).toBe("/teacher");
  });

  it("sets the document title per route", () => {
    at("/teacher");
    expect(document.title).toBe("Class · Akshara");
  });
});
