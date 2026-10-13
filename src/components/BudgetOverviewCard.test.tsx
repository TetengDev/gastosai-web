import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BudgetOverviewCard from "./BudgetOverviewCard";
import { getBudgetSummary, type BudgetSummaryItem } from "../api/budgets";

vi.mock("../api/budgets", () => ({ getBudgetSummary: vi.fn() }));

const mockGetBudgetSummary = vi.mocked(getBudgetSummary);

const item = (over: Partial<BudgetSummaryItem>): BudgetSummaryItem => ({
  categoryId: 1,
  categoryName: "Food",
  budgeted: 1000000,
  spent: 500000,
  remaining: 500000,
  percentUsed: 50,
  status: "ON_TRACK",
  ...over,
});

const renderWith = (items: BudgetSummaryItem[]) => {
  mockGetBudgetSummary.mockResolvedValue({
    month: "2026-10",
    totalBudgeted: 1000000,
    totalSpent: 500000,
    safeToSpend: 500000,
    dailyAllowance: 25000,
    items,
  });
  render(
    <MemoryRouter>
      <BudgetOverviewCard month="2026-10" />
    </MemoryRouter>,
  );
};

const fillOf = (bar: HTMLElement) => bar.querySelector('[data-testid="meter-fill"]')!;

/**
 * The banding is the server's. These pair a percentage with a status it would not have produced
 * on its own, so a card that re-derived the tone from `percentUsed` fails here.
 */
describe("BudgetOverviewCard meters", () => {
  beforeEach(() => vi.clearAllMocks());

  it("draws a named meter for each line", async () => {
    renderWith([item({ categoryName: "Food" }), item({ categoryId: 2, categoryName: "Transport" })]);
    expect(await screen.findByRole("progressbar", { name: "Food budget" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Transport budget" })).toBeInTheDocument();
  });

  it("goes amber on the server's WARNING, even at a low percentage", async () => {
    renderWith([item({ percentUsed: 40, status: "WARNING" })]);
    const bar = await screen.findByRole("progressbar", { name: "Food budget" });
    expect(fillOf(bar)).toHaveClass("bg-warn-ink");
    expect(screen.getByText("40% used")).toHaveClass("text-warn-ink");
  });

  it("stays on track when the server says so, even at a high percentage", async () => {
    renderWith([item({ percentUsed: 95, status: "ON_TRACK" })]);
    const bar = await screen.findByRole("progressbar", { name: "Food budget" });
    expect(fillOf(bar)).toHaveClass("bg-brand");
    expect(screen.getByText("95% used")).toHaveClass("text-deep");
  });

  it("hatches the overflow of an over-budget line", async () => {
    renderWith([item({ percentUsed: 125, status: "OVER_BUDGET" })]);
    const bar = await screen.findByRole("progressbar", { name: "Food budget" });
    expect(bar.querySelector('[data-testid="meter-overflow"]')).not.toBeNull();
  });
});
