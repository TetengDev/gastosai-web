import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Budget from "./Budget";
import { getBudgets, updateBudget } from "../api/budgets";
import { getCategories } from "../api/categories";
import type { BudgetResponse } from "../api/types";

vi.mock("../api/budgets", () => ({
  getBudgets: vi.fn(),
  createBudget: vi.fn(),
  updateBudget: vi.fn(),
  deleteBudget: vi.fn(),
  deleteAllBudgets: vi.fn(),
}));
vi.mock("../api/categories", () => ({ getCategories: vi.fn(), createCategory: vi.fn() }));
// The rule card owns its own amount field and its own test; here it is only noise.
vi.mock("../components/BudgetRuleCard", () => ({ default: () => null }));

const mockGetBudgets = vi.mocked(getBudgets);
const mockUpdateBudget = vi.mocked(updateBudget);
const mockGetCategories = vi.mocked(getCategories);

const budget = (over: Partial<BudgetResponse> = {}): BudgetResponse => ({
  id: 1,
  categoryId: 7,
  categoryName: "Food",
  month: "2026-09",
  amountLimit: 190000,
  currency: "PHP",
  exchangeRate: 1,
  amountLimitInBaseCurrency: 190000,
  recurring: false,
  ...over,
});

/**
 * `amountLimit` is parsed by hand in `handleSave` rather than through `ExpenseModal`. The edit
 * path is used here because it prefills the category too, which keeps the assertion on the one
 * thing that matters: the limit that reaches the API is the integer centavos that were typed.
 */
describe("Budget amount limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBudgets.mockResolvedValue([budget()]);
    mockGetCategories.mockResolvedValue([{ id: 7, name: "Food" } as never]);
    mockUpdateBudget.mockResolvedValue(budget());
  });

  const amountField = () => screen.getByPlaceholderText("0.00");

  const openEdit = async () => {
    render(<Budget />);
    fireEvent.click(await screen.findByTitle("Edit"));
    await screen.findByPlaceholderText("0.00");
  };

  const save = () => fireEvent.click(screen.getByRole("button", { name: "Save" }));

  it.each([
    ["150.75", 15075],
    ["1.15", 115],
    ["1900.50", 190050],
    ["1900", 190000],
  ])("sends %s as %i centavos", async (typed, expected) => {
    await openEdit();

    fireEvent.change(amountField(), { target: { value: typed } });
    save();

    await waitFor(() => expect(mockUpdateBudget).toHaveBeenCalledTimes(1));
    expect(mockUpdateBudget.mock.calls[0][1].amountLimit).toBe(expected);
  });

  it("pre-fills the stored centavos as the decimal amount, and round-trips it untouched", async () => {
    mockGetBudgets.mockResolvedValue([budget({ amountLimit: 887, amountLimitInBaseCurrency: 887 })]);
    await openEdit();

    expect(amountField()).toHaveValue(8.87);
    save();

    await waitFor(() => expect(mockUpdateBudget).toHaveBeenCalledTimes(1));
    expect(mockUpdateBudget.mock.calls[0][1].amountLimit).toBe(887);
  });

  // `step={0.01}` stops this at the field's own validation, before the submit handler runs.
  it("refuses a third decimal place instead of rounding it into a limit nobody set", async () => {
    await openEdit();

    fireEvent.change(amountField(), { target: { value: "1900.505" } });
    save();

    expect(mockUpdateBudget).not.toHaveBeenCalled();
    expect(screen.queryByText(/at most two decimal places/)).toBeNull();
  });

  // `1e3` passes `step` and reaches the handler, where the parser rejects it rather than
  // guessing what was meant.
  it("reports a limit it cannot parse instead of coercing it to zero", async () => {
    await openEdit();

    fireEvent.change(amountField(), { target: { value: "1e3" } });
    save();

    expect(await screen.findByText(/at most two decimal places/)).toBeTruthy();
    expect(mockUpdateBudget).not.toHaveBeenCalled();
  });
});
