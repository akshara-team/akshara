import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom(): never {
  throw new Error("kaboom");
}

describe("ErrorBoundary", () => {
  it("shows the fallback and leaves siblings mounted", () => {
    vi.spyOn(console, "error").mockImplementation(() => {}); // React logs the caught error

    render(
      <MemoryRouter>
        <div>
          <ErrorBoundary>
            <Boom />
          </ErrorBoundary>
          <p>sibling survives</p>
        </div>
      </MemoryRouter>,
    );

    expect(screen.getByText(/this screen stopped working/i)).toBeTruthy();
    expect(screen.getByText("sibling survives")).toBeTruthy();
  });

  it("recovers when reset is called", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let shouldThrow = true;
    function Flaky() {
      if (shouldThrow) throw new Error("once");
      return <p>recovered</p>;
    }

    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Flaky />
        </ErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByText(/this screen stopped working/i)).toBeTruthy();

    shouldThrow = false;
    screen.getByRole("button", { name: /try again/i }).click();
    expect(await screen.findByText("recovered")).toBeTruthy();
  });
});
