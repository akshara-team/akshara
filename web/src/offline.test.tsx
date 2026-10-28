import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { api } from "./api";
import { resetMockClass } from "./api/mockClass";
import { t } from "./i18n";
import { queued, resetOutbox } from "./state/outbox";
import { EMPTY_STORE, load, save } from "./state/storage";
import { staysOffline } from "./state/useOffline";
import { newId } from "./state/ids";

const kn = (k: Parameters<typeof t>[1], v?: Parameters<typeof t>[2]) => t("kn-IN", k, v);

function online(on: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, get: () => on });
}

beforeEach(() => {
  resetOutbox();
  resetMockClass();
  save({
    ...load(),
    reader: { id: "2", alias: "Diya K.", initials: "DK", level: "", lang: "kn-IN" },
    lang: "kn-IN",
  });
});

afterEach(() => {
  online(true);
  save({ ...EMPTY_STORE });
});

describe("reading with no connection (WP9)", () => {
  it("saves the reading, lets the child go on, and sends it when the connection is back", async () => {
    const before = (await api.childReadings(2)).length;
    render(
      <MemoryRouter initialEntries={["/home"]}>
        <App />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole("button", { name: kn("home.readStory") }));
    const demo = await screen.findByRole("button", { name: kn("read.demoReading") });

    online(false);
    fireEvent.click(demo);
    expect(await screen.findByText(kn("check.savedTitle"))).toBeTruthy();
    expect(await queued()).toHaveLength(1);
    // the story goes on: the next part is offered, not an error
    fireEvent.click(screen.getByRole("button", { name: kn("feedback.next", { n: 2 }) }));
    expect(await screen.findByRole("button", { name: kn("read.demoReading") })).toBeTruthy();

    online(true);
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
    await waitFor(async () => expect(await queued()).toHaveLength(0));
    expect((await api.childReadings(2)).length).toBe(before + 1);
  });

  it("shows the child how many readings are waiting", async () => {
    online(false);
    render(
      <MemoryRouter initialEntries={["/home"]}>
        <App />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole("button", { name: kn("home.readStory") }));
    fireEvent.click(await screen.findByRole("button", { name: kn("read.demoReading") }));
    await screen.findByText(kn("check.savedTitle"));
    fireEvent.click(screen.getByRole("link", { name: /akshara home/i }));
    expect(await screen.findByText(kn("home.waiting", { n: 1 }))).toBeTruthy();
  });

  it("does not pull the child off the reading screen when the connection drops", () => {
    expect(staysOffline("/read/kn-101")).toBe(true);
    expect(staysOffline("/checking")).toBe(true);
    expect(staysOffline("/teacher")).toBe(true);
    expect(staysOffline("/home")).toBe(false);
  });

  it("makes ids without crypto.randomUUID (plain HTTP on a school network)", () => {
    const real = crypto.randomUUID;
    Object.defineProperty(crypto, "randomUUID", { configurable: true, value: undefined });
    try {
      const a = newId();
      expect(a).toMatch(/^[0-9a-f]{32}$/);
      expect(newId()).not.toBe(a);
    } finally {
      Object.defineProperty(crypto, "randomUUID", { configurable: true, value: real });
    }
  });
});
