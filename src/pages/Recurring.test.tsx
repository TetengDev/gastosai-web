import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Recurring from "./Recurring";
import { createRecurring, getRecurring, updateRecurring } from "../api/recurring";
import { getCategories } from "../api/categories";
import type { RecurringExpenseResponse } from "../api/types";

vi.mock("../api/recurring", () => ({
  getRecurring: vi.fn(),
  createRecurring: vi.fn(),
  updateRecurring: vi.fn(),
  deleteRecurring: vi.fn(),
  deleteAllRecurring: vi.fn(),
}));
vi.mock("../api/categories", () => ({ getCategories: vi.fn() }));

const mockGetRecurring = vi.mocked(getRecurring);
const mockCreateRecurring = vi.mocked(createRecurring);
const mockUpdateRecurring = vi.mocked(updateRecurring);
const mockGetCategories = vi.mocked(getCategories);

const bill = (over: Partial<RecurringExpenseResponse> = {}): RecurringExpenseResponse => ({
  id: 1,
  name: "Netflix",
  amount: 54900,
  categoryName: "Subscriptions",
  frequency: "MONTHLY",
  dayOfMonth: 1,
  dayOfWeek: null,
  monthOfYear: null,
  active: true,
  currency: "PHP",
  exchangeRate: 1,
  ...over,
});

/**
 * A recurring bill's amount is parsed by hand in `buildRequest`, not through `ExpenseModal`.
 * These prove the typed text reaches the API as integer centavos, and that reopening a bill
 * for edit does not move the amount already stored.
 */
describe("Recurring bill amounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRecurring.mockResolvedValue([]);
    mockGetCategories.mockResolvedValue([]);
    mockCreateRecurring.mockResolvedValue(bill());
    mockUpdateRecurring.mockResolvedValue(bill());
  });

  const amountField = () => screen.getByPlaceholderText("0.00");

  const openAdd = async () => {
    render(<Recurring />);
    fireEvent.click((await screen.findAllByRole("button", { name: /Add Bill/ }))[0]);
    await screen.findByPlaceholderText("e.g. Netflix, Electricity");
  };

  const fillAndSubmit = (amount: string) => {
    fireEvent.change(screen.getByPlaceholderText("e.g. Netflix, Electricity"), { target: { value: "Netflix" } });
    fireEvent.change(amountField(), { target: { value: amount } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
  };

  it.each([
    ["150.75", 15075],
    ["1.15", 115],
    ["499.50", 49950],
    ["499", 49900],
  ])("sends %s as %i centavos", async (typed, expected) => {
    await openAdd();

    fillAndSubmit(typed);

    await waitFor(() => expect(mockCreateRecurring).toHaveBeenCalledTimes(1));
    expect(mockCreateRecurring.mock.calls[0][0].amount).toBe(expected);
  });

  // `step={0.01}` stops this at the field's own validation, before the submit handler runs —
  // hence no message of ours to assert on. What matters is that a third decimal place is never
  // quietly rounded into a bill nobody set.
  it("refuses a third decimal place instead of rounding it into a bill nobody set", async () => {
    await openAdd();

    fillAndSubmit("499.505");

    expect(mockCreateRecurring).not.toHaveBeenCalled();
    expect(screen.queryByText(/at most two decimal places/)).toBeNull();
  });

  // `1e3` is a valid number-input value and passes `step`, so it reaches the handler; the
  // parser rejects it there rather than guessing what was meant.
  it("reports an amount it cannot parse instead of coercing it to zero", async () => {
    await openAdd();

    fillAndSubmit("1e3");

    expect(await screen.findByText(/at most two decimal places/)).toBeTruthy();
    expect(mockCreateRecurring).not.toHaveBeenCalled();
  });

  it("round-trips an edited bill without moving the amount", async () => {
    mockGetRecurring.mockResolvedValue([bill({ amount: 887 })]);
    render(<Recurring />);

    fireEvent.click(await screen.findByTitle("Edit"));
    await screen.findByPlaceholderText("e.g. Netflix, Electricity");
    expect(amountField()).toHaveValue(8.87);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockUpdateRecurring).toHaveBeenCalledTimes(1));
    expect(mockUpdateRecurring.mock.calls[0][1].amount).toBe(887);
  });
});
