import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ExpenseModal from "./ExpenseModal";
import { getCategories } from "../api/categories";
import { useAuth } from "../context/AuthContext";

vi.mock("../api/categories", () => ({ getCategories: vi.fn() }));
vi.mock("../context/AuthContext", () => ({ useAuth: vi.fn() }));

const mockGetCategories = vi.mocked(getCategories);
const mockUseAuth = vi.mocked(useAuth);

/**
 * The acceptance criterion this file exists for: what leaves the modal is integer centavos.
 *
 * `onSave` receives the `ExpenseRequest` the API layer will send verbatim, so asserting on its
 * `amount` is asserting on the wire — the transport in between adds nothing.
 */
describe("ExpenseModal amounts", () => {
  beforeEach(() => {
    mockGetCategories.mockResolvedValue([]);
    mockUseAuth.mockReturnValue({
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
    } as unknown as ReturnType<typeof useAuth>);
  });

  const setup = (expense?: Parameters<typeof ExpenseModal>[0]["expense"]) => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ExpenseModal expense={expense} onSave={onSave} onClose={vi.fn()} />);
    return { onSave, user: userEvent.setup() };
  };

  const amountField = () => screen.getByPlaceholderText("0.00");

  it("sends 150.75 as 15075 centavos", async () => {
    const { onSave, user } = setup();

    await user.type(amountField(), "150.75");
    await user.type(screen.getByPlaceholderText("What was this expense for?"), "Lunch");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].amount).toBe(15075);
  });

  // `parseFloat("1.15") * 100` is 114.99999999999999. The whole point of the parser is that this
  // amount, and not only the tidy one above, survives the trip.
  it.each([
    ["1.15", 115],
    ["8.87", 887],
    ["0.05", 5],
    ["1900", 190000],
  ])("sends %s as %i centavos", async (typed, expected) => {
    const { onSave, user } = setup();

    await user.type(amountField(), typed);
    await user.type(screen.getByPlaceholderText("What was this expense for?"), "Lunch");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].amount).toBe(expected);
  });

  // The `step` attribute already stops this one at the browser's own validation, before any
  // handler runs — hence no message to assert on. What matters is that a third decimal place is
  // never quietly rounded into an amount the user did not type.
  it("refuses to save a third decimal place instead of rounding it away", async () => {
    const { onSave, user } = setup();

    await user.type(amountField(), "150.755");
    await user.type(screen.getByPlaceholderText("What was this expense for?"), "Lunch");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).not.toHaveBeenCalled();
    // No message of ours: the submit never got as far as the handler.
    expect(screen.queryByText(/at most two decimal places/)).toBeNull();
  });

  // `1e3` is a valid value for a number input and passes `step`, so it reaches the submit
  // handler; the parser rejects it there rather than guessing what was meant. It is set with
  // `fireEvent` because typing it key by key never leaves the field in a valid intermediate
  // state — a paste is how it actually arrives.
  it("reports an amount it cannot parse instead of coercing it to zero", async () => {
    const { onSave, user } = setup();

    fireEvent.change(amountField(), { target: { value: "1e3" } });
    await user.type(screen.getByPlaceholderText("What was this expense for?"), "Lunch");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText(/at most two decimal places/)).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("pre-fills an existing expense's centavos as a decimal amount", () => {
    setup({
      id: 1,
      amount: 15075,
      currency: "PHP",
      exchangeRate: 1,
      amountInBaseCurrency: 15075,
      category: "Food",
      date: "2026-09-05T12:00:00+08:00",
      description: "Lunch",
      expenseType: "PERSONAL",
      reimbursable: false,
    });

    expect(amountField()).toHaveValue(150.75);
  });

  it("round-trips an edited expense without moving the amount", async () => {
    const { onSave, user } = setup({
      id: 1,
      amount: 887,
      currency: "PHP",
      exchangeRate: 1,
      amountInBaseCurrency: 887,
      category: "Food",
      date: "2026-09-05T12:00:00+08:00",
      description: "Coffee",
      expenseType: "PERSONAL",
      reimbursable: false,
    });

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].amount).toBe(887);
  });
});
