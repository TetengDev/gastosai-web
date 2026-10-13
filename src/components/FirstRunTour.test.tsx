import { act, render } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Step } from "react-joyride";
import { MemoryRouter } from "react-router-dom";
import FirstRunTour, { startTour } from "./FirstRunTour";
import Navbar from "./Navbar";

let captured: { steps: Step[]; run: boolean } | null = null;

vi.mock("react-joyride", () => ({
  Joyride: (props: { steps: Step[]; run: boolean }) => {
    captured = { steps: props.steps, run: props.run };
    return null;
  },
  STATUS: { FINISHED: "finished", SKIPPED: "skipped" },
}));

// The Navbar is rendered for its anchors only; its data sources and auth are stubbed out.
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { name: "Demo User", nickname: "Demo", avatar: null, avatarColor: null },
    isAdmin: false,
    logout: vi.fn(),
  }),
}));
vi.mock("../hooks/useEntitlements", () => ({
  useEntitlements: () => ({ entitlements: null, has: () => true, loading: false }),
}));
vi.mock("../api/budgets", () => ({ getBudgetSummary: () => new Promise(() => {}) }));
vi.mock("../api/expenses", () => ({
  getExpensesPage: () => new Promise(() => {}),
  createExpense: vi.fn(),
}));
vi.mock("./AdminViewAsToggle", () => ({ default: () => null }));
vi.mock("./NotificationBell", () => ({ NotificationBell: () => null }));
vi.mock("./TipsPopover", () => ({ default: () => null }));

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

  it("finds every nav step's target in the rendered Navbar", () => {
    render(<FirstRunTour />);
    const { container } = render(
      <MemoryRouter>
        <Navbar isDark={false} onToggleDark={vi.fn()} />
      </MemoryRouter>,
    );
    // `body` is the welcome card and `chat` belongs to ChatWidget; every other step lives in the nav.
    const navTargets = targets().filter((t) => t !== "body" && t !== "[data-tour='chat']");
    expect(navTargets.length).toBeGreaterThan(0);
    for (const target of navTargets) {
      expect(container.querySelector(target), target).not.toBeNull();
    }
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
