import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { StoredReading } from "../state/storage";
import { RewardsStrip } from "./RewardsStrip";

function reading(at: string, id = at): StoredReading {
  return {
    id,
    passageId: "sw-1",
    storyTitle: "The cat",
    language: "kn-IN",
    at,
    parts: 1,
    accuracy: 1,
    wcpm: 40,
    seconds: 30,
    words: [],
  };
}

describe("RewardsStrip", () => {
  it("shows one star per story and the streaks", () => {
    const readings = [
      reading("2026-10-29T09:00:00", "29a"),
      reading("2026-10-29T18:00:00", "29b"),
      reading("2026-10-28T09:00:00", "28"),
      reading("2026-10-25T09:00:00", "25"),
      reading("2026-10-24T09:00:00", "24"),
      reading("2026-10-23T09:00:00", "23"),
    ];
    render(<RewardsStrip readings={readings} now={new Date(2026, 9, 29, 12, 0, 0)} />);

    expect(screen.getByText("Stars")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy(); // six finished stories
    expect(screen.getByText("Day streak")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy(); // 29 and 28
    expect(screen.getByText("Best streak")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy(); // 25, 24, 23
  });

  it("shows zeroes for a child with no readings yet", () => {
    render(<RewardsStrip readings={[]} now={new Date(2026, 9, 29, 12, 0, 0)} />);
    expect(screen.getAllByText("0")).toHaveLength(3);
  });

  it("takes labels in the child's language when given them", () => {
    render(
      <RewardsStrip
        readings={[reading("2026-10-29T09:00:00", "a")]}
        now={new Date(2026, 9, 29, 12, 0, 0)}
        labels={{ stars: "ನಕ್ಷತ್ರಗಳು", streak: "ದಿನಗಳು", best: "ಹೆಚ್ಚು" }}
      />,
    );
    expect(screen.getByText("ನಕ್ಷತ್ರಗಳು")).toBeTruthy();
    expect(screen.getByText("ದಿನಗಳು")).toBeTruthy();
    expect(screen.queryByText("Stars")).toBeNull();
  });
});
