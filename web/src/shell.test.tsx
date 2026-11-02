import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { t } from "./i18n";
import { play } from "./audio/playback";

function at(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("shell", () => {
  it("renders one responsive shell for every route", () => {
    for (const path of ["/", "/read/kn-101", "/teacher", "/recovery/offline"]) {
      const { container, unmount } = at(path);
      expect(container.querySelector(".app-main")).toBeTruthy();
      unmount();
    }
  });

  it("gives the child flow its frame: three script letters and the class, then the book page", async () => {
    const { container: role } = at("/");
    expect(role.querySelectorAll(".lang-pick__letter").length).toBe(3);
    expect(await screen.findByRole("list", { name: t("kn-IN", "reader.title") })).toBeTruthy();
    expect(role.querySelector(".frame .voice")).toBeTruthy();

    const { container: reading } = at("/read/kn-101");
    expect(reading.querySelector(".frame .book-page .reading")).toBeTruthy();
  });

  it("colours each screen by its activity", () => {
    expect(at("/").container.querySelector('[data-activity="read"]')).toBeTruthy();
    expect(at("/practice").container.querySelector('[data-activity="practice"]')).toBeTruthy();
    expect(at("/results").container.querySelector('[data-activity="reward"]')).toBeTruthy();
    expect(at("/teacher").container.querySelector('[data-activity="teacher"]')).toBeTruthy();
  });

  it("gives recovery a desktop workspace", () => {
    const { container } = at("/recovery/microphone");
    expect(container.querySelector(".workspace--w320")).toBeTruthy();
  });

  it("routes to the offline recovery screen when the browser goes offline", async () => {
    at("/home");
    window.dispatchEvent(new Event("offline"));
    expect(await screen.findByText(t("kn-IN", "recovery.offline.title"))).toBeTruthy();
  });

  it("stays on the reading screen when the connection drops, so a recording is not lost", async () => {
    at("/read/kn-101");
    window.dispatchEvent(new Event("offline"));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText(t("kn-IN", "recovery.offline.title"))).toBeNull();
  });
});

describe("playback", () => {
  it("reports no audio when the browser cannot speak", async () => {
    // jsdom has no speechSynthesis; mock mode skips the network call.
    await expect(play("ಹಾರುತ್ತಿತ್ತು", "kn-IN")).resolves.toBe("none");
  });

  it("uses the device voice when one exists", async () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    Object.defineProperty(window, "speechSynthesis", {
      value: { speak, cancel },
      configurable: true,
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class {
        text: string;
        lang = "";
        constructor(text: string) {
          this.text = text;
        }
      },
      configurable: true,
    });

    await expect(play("ಕೆಂಪು", "kn-IN")).resolves.toBe("device");
    expect(speak).toHaveBeenCalledOnce();

    // @ts-expect-error — remove the test doubles
    delete window.speechSynthesis;
    // @ts-expect-error — remove the test doubles
    delete window.SpeechSynthesisUtterance;
  });
});
