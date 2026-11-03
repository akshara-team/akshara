import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { MarkedText } from "./components";
import { t } from "./i18n";
import theme from "./theme/theme.css?raw";

const ROUTES = [
  "/",
  "/switch",
  "/home",
  "/reader",
  "/read/kn-101",
  "/recovery/microphone",
  "/recovery/offline",
  "/teacher",
  "/teacher/story",
  "/teacher/child/1",
  "/teacher/child/1/reading/seed-1-2026-10-19",
  "/teacher/edit/1",
  "/teacher/child/1/placement",
  "/practice",
  "/feedback",
  "/results",
  "/teacher/review",
  "/teacher/reliability",
  "/teacher/sentences",
  "/practice/sentence",

  "/teacher/add",
  "/no-such-page",
];

function at(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("axe", () => {
  // jsdom has no layout, so axe cannot measure colour contrast; the theme test below does.
  const options: axe.RunOptions = { rules: { "color-contrast": { enabled: false } } };

  for (const path of ROUTES) {
    it(`finds no violations on ${path}`, async () => {
      const { container, unmount } = at(path);
      // Let the mock API answer, so the loaded page is checked, not the loading state.
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      // some screens load a data file first (practice sentences): wait for it
      await waitFor(() => expect(container.textContent).not.toMatch(/Loading/));
      const result = await axe.run(container, options);
      const summary = result.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`);
      expect(summary).toEqual([]);
      unmount();
    });
  }
});

describe("keyboard and screen readers", () => {
  it("offers a skip link that moves focus to the main region", () => {
    at("/");
    const skip = screen.getByRole("link", { name: "Skip to content" });
    fireEvent.click(skip);
    expect(document.activeElement).toBe(document.getElementById("main"));
  });

  it("moves focus to the new screen's heading after navigation", () => {
    let go: (to: string) => void = () => {};
    function Grab() {
      go = useNavigate();
      return null;
    }
    render(
      <MemoryRouter initialEntries={["/teacher"]}>
        <Grab />
        <App />
      </MemoryRouter>,
    );
    act(() => go("/teacher/story"));
    const focused = document.activeElement as HTMLElement;
    expect(focused.tagName === "H1" || focused.id === "main").toBe(true);
  });

  it("says a word's result aloud, not only with colour and icon", () => {
    const words = [{ op: "skipped" as const, word: "ಮನೆ", said: null, index: 0, check: false }];
    const { unmount } = render(<MarkedText words={words} lang="kn-IN" />);
    // The child hears it in their language; the teacher in English.
    expect(screen.getByText(new RegExp(t("kn-IN", "chip.skipped")))).toBeTruthy();
    expect(screen.getByText("ಮನೆ").closest("[lang]")?.getAttribute("lang")).toBe("kn-IN");
    unmount();
    render(<MarkedText words={words} lang="kn-IN" forTeacher />);
    expect(screen.getByText(/skipped/)).toBeTruthy();
  });

  it("marks native-script text with its language", () => {
    const { container } = at("/read/kn-101");
    const passage = container.querySelector(".reading");
    expect(passage?.getAttribute("lang")).toBeTruthy();
  });
});

/** WCAG relative luminance contrast, from the theme's own hex values. */
function token(name: string): string {
  const m = theme.match(new RegExp(String.raw`--${name}:\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`no hex value for --${name}`);
  return m[1];
}

function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("theme contrast (WCAG AA)", () => {
  // Text pairs the stylesheets actually use: 4.5:1.
  const text: [string, string][] = [
    ["ink", "limewash"], // text on the wall
    ["rice", "ink"], // the register's action, the skip link
    ["ink-2", "limewash"], // a register's status sentence
    ["ink-2", "peacock-wash"], // a banner
    ["ink-muted", "rice"],
    ["color-danger-text", "rice"], // field errors, the delete button
    ["leaf-deep", "leaf-wash"], // "on target", the benchmark
    ["turmeric-deep", "turmeric-wash"], // "practise together"
    // The picture book that listens (DESIGN.md).
    ["ink", "rice"], // the book page
    ["ink-2", "rice"],
    ["ink-muted", "rice"], // credits, hints
    ["ink-muted", "limewash"], // the wall
    ["rice", "peacock"], // the action on the book
    ["ink", "turmeric"], // the action on the slate, a lit tile
    ["ink", "turmeric-wash"], // a word read as another
    ["chalk", "slate"], // the slate
    ["chalk", "slate-2"], // a tile
    ["chalk-dim", "slate"], // the word count on the slate
    ["rice", "leaf-deep"], // a tile read right
    ["leaf-deep", "rice"], // a tick, "on target"
    ["turmeric-deep", "rice"], // "practise together"
    ["peacock", "peacock-wash"], // a register group
  ];
  for (const [fg, bg] of text) {
    it(`${fg} on ${bg} is at least 4.5:1`, () => {
      expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
    });
  }

  // Icon on a control: 3:1 (non-text contrast). The disabled "processing" mic is exempt.
  // Non-text contrast: 3:1 for the edges that hold meaning.
  it("a field's edge and a skipped word's dot are at least 3:1", () => {
    expect(contrast(token("ink-muted"), token("rice"))).toBeGreaterThanOrEqual(3);
    expect(contrast(token("laterite"), token("rice"))).toBeGreaterThanOrEqual(3);
  });
});
