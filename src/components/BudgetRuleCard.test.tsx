import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BudgetRuleCard from "./BudgetRuleCard";
import {
  getBudgetRule,
  getBudgetRuleSummary,
  putBudgetRule,
  type BudgetRule,
  type BudgetRuleSummary,
} from "../api/budgetRules";

vi.mock("../api/budgetRules", () => ({
  getBudgetRule: vi.fn(),
  getBudgetRuleSummary: vi.fn(),
  putBudgetRule: vi.fn(),
  setBudgetRuleEnabled: vi.fn(),
  assignBuckets: vi.fn(),
}));

const mockGetBudgetRule = vi.mocked(getBudgetRule);
const mockGetBudgetRuleSummary = vi.mocked(getBudgetRuleSummary);
const mockPutBudgetRule = vi.mocked(putBudgetRule);

const rule = (monthlyIncome: number): BudgetRule => ({
  enabled: true,
  ruleType: "FIFTY_THIRTY_TWENTY",
  monthlyIncome,
  needsPct: 50,
  wantsPct: 30,
  savingsPct: 20,
});

const summary: BudgetRuleSummary = {
  month: "2026-09",
  monthlyIncome: 0,
  ruleType: "FIFTY_THIRTY_TWENTY",
  buckets: [],
  unassignedSpent: 0,
};

/**
 * `monthlyIncome` is one of the four amount fields wired to `parseAmountToCentavos` by hand
 * rather than through `ExpenseModal`, so it needs its own proof that a typed amount reaches
 * the API as integer centavos and comes back as the same text.
 */
describe("BudgetRuleCard monthly income", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBudgetRule.mockResolvedValue(rule(0));
    mockGetBudgetRuleSummary.mockResolvedValue(summary);
    mockPutBudgetRule.mockResolvedValue(rule(0));
  });

  // The percentage inputs only exist under the CUSTOM preset, which is not the default, so
  // the single spinbutton on screen is the income field.
  const incomeField = async () => {
    await screen.findByText("Budgeting Rule");
    return screen.getByRole("spinbutton");
  };

  const setup = () =>
    render(<BudgetRuleCard month="2026-09" categories={[]} onCategoriesChanged={vi.fn()} />);

  // `parseFloat("150.75") * 100` happens to be exact, but `parseFloat("1.15") * 100` is
  // 114.99999999999999 — the reason this field parses rather than multiplies.
  it.each([
    ["150.75", 15075],
    ["1.15", 115],
    ["45000.50", 4500050],
    ["45000", 4500000],
  ])("sends %s as %i centavos", async (typed, expected) => {
    setup();
    const field = await incomeField();

    fireEvent.change(field, { target: { value: typed } });
    fireEvent.click(screen.getByRole("button", { name: "Save rule" }));

    await waitFor(() => expect(mockPutBudgetRule).toHaveBeenCalledTimes(1));
    expect(mockPutBudgetRule.mock.calls[0][0].monthlyIncome).toBe(expected);
  });

  it("pre-fills the saved centavos as the decimal amount that was typed", async () => {
    mockGetBudgetRule.mockResolvedValue(rule(4500050));
    setup();

    await waitFor(async () => expect(await incomeField()).toHaveValue(45000.5));
  });

  it("refuses a third decimal place instead of rounding it into an income nobody set", async () => {
    setup();
    const field = await incomeField();

    fireEvent.change(field, { target: { value: "1000.755" } });
    fireEvent.click(screen.getByRole("button", { name: "Save rule" }));

    expect(await screen.findByText(/at most two decimal places|amount like 45000/)).toBeTruthy();
    expect(mockPutBudgetRule).not.toHaveBeenCalled();
  });
});
