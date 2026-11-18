import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import ExpenseModal from "./ExpenseModal";
import { getCategories } from "../api/categories";
import { getExpensesPage, type Expense, type ExpensePage } from "../api/expenses";
import { getBudgetSummary, type BudgetSummaryResponse } from "../api/budgets";
import { useAuth } from "../context/AuthContext";
import { invalidateCategoryCache } from "../lib/cache";

vi.mock("../api/categories", () => ({ getCategories: vi.fn() }));
vi.mock("../api/expenses", () => ({ getExpensesPage: vi.fn() }));
vi.mock("../api/budgets", () => ({ getBudgetSummary: vi.fn() }));
vi.mock("../context/AuthContext", () => ({ useAuth: vi.fn() }));

const mockGetCategories = vi.mocked(getCategories);
const mockGetExpensesPage = vi.mocked(getExpensesPage);
const mockGetBudgetSummary = vi.mocked(getBudgetSummary);
const mockUseAuth = vi.mocked(useAuth);

// Every describe below renders the real modal, which now reads the recent history and, after a
// new expense saves, the budget summary. Defaults keep both off the network; tests override them.
beforeEach(() => {
  // The modal caches categories for five minutes at module level; each test brings its own list.
  invalidateCategoryCache();
  mockGetExpensesPage.mockResolvedValue({ content: [], totalElements: 0, last: true } as unknown as ExpensePage);
  mockGetBudgetSummary.mockResolvedValue({ items: [] } as unknown as BudgetSummaryResponse);
});

// The confirmation is appended to <body> on purpose (R17), so RTL's cleanup does not see it.
afterEach(() => {
  document.querySelectorAll("[data-expense-toast]").forEach((n) => n.remove());
});

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
    await user.type(screen.getByPlaceholderText("Lunch at Jollibee"), "Lunch");
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
    await user.type(screen.getByPlaceholderText("Lunch at Jollibee"), "Lunch");
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
    await user.type(screen.getByPlaceholderText("Lunch at Jollibee"), "Lunch");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).not.toHaveBeenCalled();
    // No message of ours: the submit never got as far as the handler.
    expect(screen.queryByText("Enter an amount greater than zero.")).toBeNull();
  });

  // `1e3` is a valid value for a number input and passes `step`, so it reaches the submit
  // handler; the parser rejects it there rather than guessing what was meant. It is set with
  // `fireEvent` because typing it key by key never leaves the field in a valid intermediate
  // state — a paste is how it actually arrives.
  it("reports an amount it cannot parse instead of coercing it to zero", async () => {
    const { onSave, user } = setup();

    fireEvent.change(amountField(), { target: { value: "1e3" } });
    await user.type(screen.getByPlaceholderText("Lunch at Jollibee"), "Lunch");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Enter an amount greater than zero.")).toBeTruthy();
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
      source: "MANUAL",
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
      source: "MANUAL",
    });

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].amount).toBe(887);
  });
});

/**
 * The amount prefix now reads its symbol from `formatters.currencySymbol` rather than a local
 * table. These assert the rendered string, not the import, so they would still fail if the shared
 * helper's table drifted away from what this modal used to show.
 */
describe("ExpenseModal currency prefix", () => {
  beforeEach(() => {
    mockGetCategories.mockResolvedValue([]);
    mockUseAuth.mockReturnValue({
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
    } as unknown as ReturnType<typeof useAuth>);
    // A non-PHP currency makes the modal fetch a suggested rate. The component swallows the
    // rejection; this only keeps the test off the network.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("no network in tests")));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderWith = (currency: string) => {
    render(
      <ExpenseModal
        expense={{
          id: 1,
          amount: 15075,
          currency,
          exchangeRate: 1,
          amountInBaseCurrency: 15075,
          category: "Food",
          date: "2026-09-05T12:00:00+08:00",
          description: "Lunch",
          expenseType: "PERSONAL",
          reimbursable: false,
          source: "MANUAL",
        }}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
      />,
    );
  };

  it.each([
    ["PHP", "₱"],
    ["USD", "$"],
    ["EUR", "€"],
    ["SGD", "S$"],
    ["JPY", "¥"],
    ["GBP", "£"],
    ["AUD", "A$"],
  ])("shows %s as %s", (currency, symbol) => {
    renderWith(currency);
    expect(screen.getByText(symbol)).toBeTruthy();
  });

  it("falls back to the code for a currency with no symbol", () => {
    renderWith("CAD");
    expect(screen.getByText("CAD")).toBeTruthy();
  });

  // Pesos by name; any other currency by its symbol, as Goals names its amount field.
  it.each([
    ["PHP", "Amount in pesos"],
    ["USD", "Amount ($)"],
    ["CAD", "Amount (CAD)"],
  ])("names the amount field for %s as %s", (currency, name) => {
    renderWith(currency);
    expect(screen.getByRole("spinbutton", { name })).toBeTruthy();
  });

  it("ties the Currency label to its picker", () => {
    renderWith("PHP");
    const group = screen.getByRole("group", { name: "Currency" });
    expect(within(group).getByRole("button", { name: /PHP/ })).toBeTruthy();
  });

  it("follows the currency picker", async () => {
    const user = userEvent.setup();
    renderWith("PHP");

    await user.click(screen.getByRole("button", { name: /PHP/ }));
    await user.click(screen.getByRole("button", { name: /USD/ }));

    expect(await screen.findByText("$")).toBeTruthy();
    expect(screen.queryByText("₱")).toBeNull();
  });
});

const expenseIn = (category: string, id: number): Expense => ({
  id,
  amount: 100,
  currency: "PHP",
  exchangeRate: 1,
  amountInBaseCurrency: 100,
  category,
  date: "2026-11-01T12:00:00+08:00",
  description: `e${id}`,
  expenseType: "PERSONAL",
  reimbursable: false,
  source: "MANUAL",
});

const history = (...categories: string[]) =>
  ({
    content: categories.map((c, i) => expenseIn(c, i + 1)),
    totalElements: categories.length,
    last: true,
  }) as unknown as ExpensePage;

const category = (id: number, name: string) => ({ id, name }) as Awaited<ReturnType<typeof getCategories>>[number];

/**
 * TEN-440: the add flow starts with the amount. It is the largest field and has focus on open,
 * the six most recent categories sit under it as chips (R20, topped up from the category list),
 * and the date starts at Manila's now.
 */
describe("ExpenseModal amount-first", () => {
  beforeEach(() => {
    mockGetCategories.mockResolvedValue([]);
    mockUseAuth.mockReturnValue({ user: null } as unknown as ReturnType<typeof useAuth>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("focuses the amount, named for screen readers, on a new expense", () => {
    render(<ExpenseModal onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole("spinbutton", { name: "Amount in pesos" })).toHaveFocus();
  });

  it("offers the six most recently used categories, newest first", async () => {
    mockGetExpensesPage.mockResolvedValue(
      history("Food", "Transport", "Food", "Bills", "Fun", "Health", "Pets", "Gifts"),
    );
    render(<ExpenseModal onSave={vi.fn()} onClose={vi.fn()} />);

    const group = await screen.findByRole("group", { name: "Recent categories" });
    await waitFor(() =>
      expect([...group.querySelectorAll("button")].map((b) => b.textContent)).toEqual([
        "Food",
        "Transport",
        "Bills",
        "Fun",
        "Health",
        "Pets",
      ]),
    );
    expect(mockGetExpensesPage).toHaveBeenCalledWith({ page: 0, size: 50 });
  });

  it("tops the chips up from the category list when history has fewer than six", async () => {
    mockGetExpensesPage.mockResolvedValue(history("Food"));
    mockGetCategories.mockResolvedValue([category(1, "Bills"), category(2, "Food"), category(3, "Fun")]);
    render(<ExpenseModal onSave={vi.fn()} onClose={vi.fn()} />);

    const group = await screen.findByRole("group", { name: "Recent categories" });
    await waitFor(() =>
      expect([...group.querySelectorAll("button")].map((b) => b.textContent)).toEqual(["Food", "Bills", "Fun"]),
    );
  });

  it("sets the category from a chip", async () => {
    const user = userEvent.setup();
    mockGetExpensesPage.mockResolvedValue(history("Food", "Bills"));
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ExpenseModal onSave={onSave} onClose={vi.fn()} />);

    const bills = await screen.findByRole("button", { name: "Bills" });
    await user.click(bills);
    expect(bills).toHaveAttribute("aria-pressed", "true");

    await user.type(screen.getByPlaceholderText("0.00"), "10");
    await user.type(screen.getByPlaceholderText("Lunch at Jollibee"), "Power");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].category).toBe("Bills");
  });

  // 17:00 UTC on the 17th is 01:00 on the 18th in Manila. `toISOString()` gave the 17th.
  it("dates a new expense at Manila's now, not UTC's", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-17T17:00:00Z"));
    render(<ExpenseModal onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByLabelText("Date & Time")).toHaveValue("2026-11-18T01:00");
  });
});

/**
 * R19's confirmation: the server's `remaining` for the saved category's line in the expense's own
 * month, read after the save. The fixture's `remaining` is deliberately not budgeted - spent, so a
 * client-side subtraction would show the wrong figure.
 */
describe("ExpenseModal logged toast", () => {
  beforeEach(() => {
    mockGetCategories.mockResolvedValue([category(1, "Food"), category(2, "Bills")]);
    mockUseAuth.mockReturnValue({ user: null } as unknown as ReturnType<typeof useAuth>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const summaryWith = (remaining: number) =>
    ({
      items: [{ categoryName: "Food", budgeted: 300_000, spent: 50_000, remaining, percentUsed: 41, status: "ON_TRACK" }],
    }) as unknown as BudgetSummaryResponse;

  const logFood = async (onSave = vi.fn().mockResolvedValue(undefined)) => {
    const user = userEvent.setup();
    render(<ExpenseModal onSave={onSave} onClose={vi.fn()} />);
    await user.click(await screen.findByRole("button", { name: "Food" }));
    await user.type(screen.getByPlaceholderText("0.00"), "250");
    fireEvent.change(screen.getByLabelText("Date & Time"), { target: { value: "2026-10-05T09:00" } });
    await user.type(screen.getByPlaceholderText("Lunch at Jollibee"), "Groceries");
    await user.click(screen.getByRole("button", { name: "Save" }));
    return onSave;
  };

  beforeEach(() => {
    mockGetExpensesPage.mockResolvedValue(history("Food"));
  });

  it("says what is left in the category's budget for the expense's month", async () => {
    mockGetBudgetSummary.mockResolvedValue(summaryWith(175_000));
    await logFood();

    const toast = await screen.findByRole("status");
    expect(toast).toHaveTextContent("Logged ₱250.00 · ₱1,750.00 left in Food");
    expect(mockGetBudgetSummary).toHaveBeenCalledWith("2026-10");
  });

  it("says by how much the category is over", async () => {
    mockGetBudgetSummary.mockResolvedValue(summaryWith(-5_000));
    await logFood();

    expect(await screen.findByRole("status")).toHaveTextContent("Logged ₱250.00 · Over by ₱50.00 in Food");
  });

  it("states the amount alone when the category has no budget", async () => {
    mockGetBudgetSummary.mockResolvedValue({ items: [] } as unknown as BudgetSummaryResponse);
    await logFood();

    const toast = await screen.findByRole("status");
    await waitFor(() => expect(toast.textContent).toBe("Logged ₱250.00"));
  });

  it("states the amount alone when the summary fails", async () => {
    mockGetBudgetSummary.mockRejectedValue(new Error("offline"));
    await logFood();

    const toast = await screen.findByRole("status");
    await waitFor(() => expect(toast.textContent).toBe("Logged ₱250.00"));
  });

  it("waits at most 1.5 s for the summary, then goes away after 4 s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockGetBudgetSummary.mockReturnValue(new Promise(() => {}));
    await logFood();
    await act(async () => {});
    expect(screen.queryByRole("status")).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    const toast = await screen.findByRole("status");
    await waitFor(() => expect(toast.textContent).toBe("Logged ₱250.00"));

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows nothing when the save fails", async () => {
    await logFood(vi.fn().mockRejectedValue(new Error("boom")));

    await screen.findByText(/Failed to save/);
    expect(screen.queryByRole("status")).toBeNull();
    expect(mockGetBudgetSummary).not.toHaveBeenCalled();
  });

  it("shows nothing for an edit", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ExpenseModal expense={expenseIn("Food", 9)} onSave={onSave} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect(screen.queryByRole("status")).toBeNull();
    expect(mockGetBudgetSummary).not.toHaveBeenCalled();
  });
});
