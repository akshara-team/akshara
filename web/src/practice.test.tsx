import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { t } from "./i18n";

function at(words: string[]) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/practice", state: { words } }]}>
      <App />
    </MemoryRouter>,
  );
}

const kn = (k: Parameters<typeof t>[1], v?: Parameters<typeof t>[2]) => t("kn-IN", k, v);

describe("akshara practice (mock mode)", () => {
  it("splits each word into tiles, takes a re-read, and ends after the last word", async () => {
    at(["ಹಾರುತ್ತಿತ್ತು", "ಕೆಂಪು"]);
    const tiles = await screen.findByRole("img", { name: "ಹಾರುತ್ತಿತ್ತು" });
    expect(tiles.querySelectorAll(".practice-tile").length).toBeGreaterThan(1);
    expect(screen.getByText(kn("practice.wordOf", { n: 1, total: 2 }))).toBeTruthy();

    fireEvent.click(await screen.findByRole("button", { name: kn("read.demoReading") }));
    expect(await screen.findByText(kn("practice.great"))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: kn("practice.next") }));

    expect(await screen.findByRole("img", { name: "ಕೆಂಪು" })).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: kn("read.demoReading") }));
    fireEvent.click(await screen.findByRole("button", { name: kn("practice.next") }));
    expect(await screen.findByText(kn("practice.done", { count: 2 }))).toBeTruthy();
  });

  it("shows at most three words", async () => {
    at(["ಒಂದು", "ಎರಡು", "ಮೂರು", "ನಾಲ್ಕು"]);
    expect(await screen.findByText(kn("practice.wordOf", { n: 1, total: 3 }))).toBeTruthy();
  });
});
