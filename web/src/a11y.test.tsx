import { act, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { WordChip } from "./components/WordChip";
import theme from "./theme/theme.css?raw";

const ROUTES = [
  "/",
  "/switch",
  "/reader",
  "/read/kn-101",
  "/recovery/microphone",
  "/recovery/offline",
  "/teacher",
  "/teacher/story",
  "/teacher/child/c1",
  "/teacher/attempt/c1",
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
    render(<WordChip status="skipped" word="ಮನೆ" lang="kn-IN" />);
    expect(screen.getByText(/skipped/)).toBeTruthy();
    expect(screen.getByText("ಮನೆ").getAttribute("lang")).toBe("kn-IN");
  });

  it("marks native-script text with its language", () => {
    const { container } = at("/read/kn-101");
    const passage = container.querySelector(".reading-text");
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
    ["color-text-primary", "color-background"],
    ["color-text-primary", "color-brand-primary"], // primary button, mic button
    ["color-text-primary", "color-background-soft"], // language badge, avatar, active tab
    ["color-text-secondary", "color-background-soft"], // info banner
    ["color-on-accent", "color-secondary"], // secondary button, skip link
    ["color-secondary", "color-background"], // ghost button
    ["color-muted", "color-background"],
    ["color-muted", "color-surface-muted"],
  ];
  for (const [fg, bg] of text) {
    it(`${fg} on ${bg} is at least 4.5:1`, () => {
      expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
    });
  }

  // Icon on a control: 3:1 (non-text contrast). The disabled "processing" mic is exempt.
  it("the stop icon on the recording button is at least 3:1", () => {
    expect(contrast(token("color-on-accent"), token("color-feedback-danger"))).toBeGreaterThanOrEqual(3);
  });
});
