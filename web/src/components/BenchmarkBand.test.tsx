import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BenchmarkBand } from "./BenchmarkBand";

describe("BenchmarkBand", () => {
  it("shows the reading against the end-of-Grade-3 goal", () => {
    render(<BenchmarkBand lang="hi-IN" grade={3} wcpm={40} />);
    expect(screen.getByText("40 wpm")).toBeTruthy();
    expect(screen.getByText(/meets the end-of-grade-3 goal/i)).toBeTruthy();
    expect(screen.getByText(/35–54/)).toBeTruthy();
  });

  it("states where a struggling reader is, without a pass or fail", () => {
    render(<BenchmarkBand lang="kn-IN" grade={3} wcpm={10} />);
    expect(screen.getByText(/below the end-of-grade-3 goal/i)).toBeTruthy();
  });

  it("renders nothing without a reading", () => {
    const { container } = render(<BenchmarkBand lang="kn-IN" grade={3} wcpm={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for a grade with no band", () => {
    const { container } = render(<BenchmarkBand lang="kn-IN" grade={2} wcpm={40} />);
    expect(container.firstChild).toBeNull();
  });
});
