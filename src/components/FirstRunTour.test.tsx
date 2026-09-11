import { act, render } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Step } from "react-joyride";
import FirstRunTour, { startTour } from "./FirstRunTour";

let captured: { steps: Step[]; run: boolean } | null = null;

vi.mock("react-joyride", () => ({
  Joyride: (props: { steps: Step[]; run: boolean }) => {
    captured = { steps: props.steps, run: props.run };
    return null;
  },
  STATUS: { FINISHED: "finished", SKIPPED: "skipped" },
}));

/** The tour's targets, in the order Joyride will visit them. */
function targets(): string[] {
  return (captured?.steps ?? []).map((step) => String(step.target));
}

describe("FirstRunTour", () => {
  beforeEach(() => {
    captured = null;
    localStorage.clear();
  });

  it("visits every nav destination in navigation order", () => {
    render(<FirstRunTour />);
    expect(targets()).toEqual([
      "body",
      "[data-tour='nav-dashboard']",
      "[data-tour='nav-expenses']",
      "[data-tour='nav-categories']",
      "[data-tour='nav-budget']",
      "[data-tour='nav-recurring']",
      "[data-tour='nav-goals']",
      "[data-tour='chat']",
      "[data-tour='nav-settings']",
    ]);
  });

  it("keeps the existing steps' copy", () => {
    render(<FirstRunTour />);
    const byTarget = new Map(
      (captured?.steps ?? []).map((step) => [String(step.target), step]),
    );
    expect(byTarget.get("[data-tour='nav-expenses']")?.title).toBe("Log expenses your way");
    expect(byTarget.get("[data-tour='nav-goals']")?.title).toBe("Savings goals");
    expect(byTarget.get("[data-tour='nav-settings']")?.title).toBe("Settings & AI key");
  });

  it("does not run before a first run or a replay", () => {
    render(<FirstRunTour />);
    expect(captured?.run).toBe(false);
  });

  it("replays the same steps, including the new ones", () => {
    localStorage.setItem("gastosai:tour:completed", "1");
    render(<FirstRunTour />);
    expect(captured?.run).toBe(false);

    act(() => startTour());

    expect(captured?.run).toBe(true);
    expect(targets()).toContain("[data-tour='nav-dashboard']");
    expect(targets()).toContain("[data-tour='nav-categories']");
  });
});
