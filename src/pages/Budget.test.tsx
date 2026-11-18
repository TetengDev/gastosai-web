import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Budget from "./Budget";
import { getBudgetSummary, getBudgets, updateBudget } from "../api/budgets";
import { getCategories } from "../api/categories";
import type { BudgetResponse, BudgetSummaryItem, BudgetSummaryResponse } from "../api/budgets";
import { EXPENSE_CHANGED } from "../lib/events";

vi.mock("../api/budgets", () => ({
  getBudgets: vi.fn(),
  getBudgetSummary: vi.fn(),
  createBudget: vi.fn(),
  updateBudget: vi.fn(),
  deleteBudget: vi.fn(),
  deleteAllBudgets: vi.fn(),
}));
vi.mock("../api/categories", () => ({ getCategories: vi.fn(), createCategory: vi.fn() }));
// The rule card owns its own amount field and its own test; here it is only noise.
vi.mock("../components/BudgetRuleCard", () => ({ default: () => null }));

const mockGetBudgets = vi.mocked(getBudgets);
const mockGetBudgetSummary = vi.mocked(getBudgetSummary);
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

const item = (over: Partial<BudgetSummaryItem> = {}): BudgetSummaryItem => ({
  categoryId: 7,
  categoryName: "Food",
  budgeted: 190000,
  spent: 0,
  remaining: 190000,
  percentUsed: 0,
  status: "ON_TRACK",
  ...over,
});

const summaryOf = (items: BudgetSummaryItem[], month = "2026-09"): BudgetSummaryResponse => ({
  month,
  items,
  totalBudgeted: 0,
  totalSpent: 0,
  safeToSpend: 0,
  dailyAllowance: 0,
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
    mockGetBudgetSummary.mockResolvedValue(summaryOf([item()]));
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

/**
 * Every figure on a row is the server's: `/budgets/summary` carries `percentUsed`, `remaining` and
 * `status`; `/budgets` carries only the definitions with the ids Edit and Delete need. The page
 * joins the two by `categoryId` and never recomputes a figure or a band.
 */
describe("Budget rows", () => {
  const three = [
    { b: budget({ id: 1, categoryId: 1, categoryName: "Transport", amountLimit: 100_000, amountLimitInBaseCurrency: 100_000 }),
      i: item({ categoryId: 1, categoryName: "Transport", budgeted: 100_000, spent: 30_000, remaining: 70_000, percentUsed: 30, status: "ON_TRACK" }) },
    { b: budget({ id: 2, categoryId: 2, categoryName: "Food", amountLimit: 500_000, amountLimitInBaseCurrency: 500_000 }),
      i: item({ categoryId: 2, categoryName: "Food", budgeted: 500_000, spent: 520_000, remaining: -20_000, percentUsed: 104, status: "OVER_BUDGET" }) },
    { b: budget({ id: 3, categoryId: 3, categoryName: "Bills", amountLimit: 500_000, amountLimitInBaseCurrency: 500_000 }),
      i: item({ categoryId: 3, categoryName: "Bills", budgeted: 500_000, spent: 420_000, remaining: 80_000, percentUsed: 84, status: "WARNING" }) },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCategories.mockResolvedValue([]);
    mockGetBudgets.mockResolvedValue(three.map((r) => r.b));
    mockGetBudgetSummary.mockResolvedValue(summaryOf(three.map((r) => r.i)));
  });

  const bodyRows = () => within(screen.getAllByRole("rowgroup")[1]).getAllByRole("row");
  const rowFor = (name: string) => bodyRows().find((r) => within(r).queryByText(name))!;
  const fillOf = (name: string) =>
    screen.getByRole("progressbar", { name }).querySelector<HTMLElement>('[data-testid="meter-fill"]')!;

  it("puts the fullest budget first", async () => {
    render(<Budget />);
    await screen.findByRole("progressbar", { name: "Food budget" });

    expect(bodyRows().map((r) => within(r).getByRole("progressbar").getAttribute("aria-label"))).toEqual([
      "Food budget",
      "Bills budget",
      "Transport budget",
    ]);
  });

  it("says what is left, or how much over, in the server's figures", async () => {
    render(<Budget />);
    await screen.findByRole("progressbar", { name: "Food budget" });

    expect(rowFor("Bills")).toHaveTextContent("₱800.00 left");
    expect(rowFor("Food")).toHaveTextContent("Over by ₱200.00");
    expect(rowFor("Bills")).toHaveTextContent("₱4,200.00 of ₱5,000.00 · 84%");
  });

  it("reads a negative remaining as over by its absolute amount", async () => {
    mockGetBudgets.mockResolvedValue([three[1].b]);
    mockGetBudgetSummary.mockResolvedValue(summaryOf([{ ...three[1].i, remaining: -120_000 }]));
    render(<Budget />);

    expect(await screen.findByText("Over by ₱1,200.00")).toBeTruthy();
  });

  it("colours each meter from the server's status, not from its percentage", async () => {
    render(<Budget />);
    await screen.findByRole("progressbar", { name: "Food budget" });

    expect(fillOf("Transport budget")).toHaveClass("bg-brand");
    expect(fillOf("Bills budget")).toHaveClass("bg-warn-ink");
    expect(screen.getByRole("progressbar", { name: "Bills budget" })).not.toHaveClass("border-warn-ink");
    expect(fillOf("Food budget")).toHaveClass("bg-warn-ink");
    expect(screen.getByRole("progressbar", { name: "Food budget" })).toHaveClass("border-warn-ink");
  });

  // Statuses that disagree with an 80/100 reading of the percentage: a client that re-derived the
  // band from percentUsed would colour both of these wrongly.
  it("follows the status even where the percentage would band otherwise", async () => {
    mockGetBudgets.mockResolvedValue([three[0].b, three[2].b]);
    mockGetBudgetSummary.mockResolvedValue(
      summaryOf([
        { ...three[0].i, percentUsed: 95, status: "ON_TRACK" },
        { ...three[2].i, percentUsed: 40, status: "WARNING" },
      ]),
    );
    render(<Budget />);
    await screen.findByRole("progressbar", { name: "Transport budget" });

    expect(fillOf("Transport budget")).toHaveClass("bg-brand");
    expect(fillOf("Bills budget")).toHaveClass("bg-warn-ink");
  });

  it("keeps a budget the summary does not know yet, last and without a meter", async () => {
    const fresh = budget({ id: 9, categoryId: 9, categoryName: "Pets" });
    mockGetBudgets.mockResolvedValue([fresh, ...three.map((r) => r.b)]);
    render(<Budget />);
    await screen.findByRole("progressbar", { name: "Food budget" });

    const last = bodyRows().at(-1)!;
    expect(last).toHaveTextContent("Pets");
    expect(within(last).queryByRole("progressbar")).toBeNull();
    expect(within(last).getByTitle("Edit")).toBeTruthy();
  });

  // Every write on this page already announces itself; the rows have to follow, or a budget just
  // created would sit without its meter until the page is reloaded.
  it.each([["gastosai:budget-changed"], [EXPENSE_CHANGED]])("refetches the summary on %s", async (event) => {
    render(<Budget />);
    await screen.findByRole("progressbar", { name: "Food budget" });

    mockGetBudgetSummary.mockResolvedValue(
      summaryOf(three.map((r) => (r.i.categoryId === 1 ? { ...r.i, spent: 110_000, remaining: -10_000, percentUsed: 110, status: "OVER_BUDGET" } : r.i))),
    );
    act(() => { window.dispatchEvent(new CustomEvent(event)); });

    await waitFor(() => expect(bodyRows()[0]).toHaveTextContent("Transport"));
    expect(rowFor("Transport")).toHaveTextContent("Over by ₱100.00");
  });
});

describe("Budget header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCategories.mockResolvedValue([]);
    mockGetBudgets.mockResolvedValue([
      budget({ id: 1, categoryId: 1, categoryName: "Transport" }),
      budget({ id: 2, categoryId: 2, categoryName: "Food" }),
    ]);
    mockGetBudgetSummary.mockResolvedValue(
      summaryOf([
        item({ categoryId: 1, categoryName: "Transport", percentUsed: 40, status: "ON_TRACK" }),
        item({ categoryId: 2, categoryName: "Food", percentUsed: 112, remaining: -5_000, status: "OVER_BUDGET" }),
      ]),
    );
  });

  // One Piso per screen, in the worst row's mood; rows carry meters, never a Piso.
  it("shows one Piso, in the worst band's mood, and none on the rows", async () => {
    const { container } = render(<Budget />);
    await screen.findByRole("progressbar", { name: "Food budget" });

    const pisos = container.querySelectorAll("svg[data-piso-state]");
    expect(pisos).toHaveLength(1);
    expect(pisos[0]).toHaveAttribute("data-piso-state", "overBudget");
    expect(pisos[0].closest("table")).toBeNull();
  });

  // Piso is never the only signal: the header says what the face says, in counts of the server's
  // own statuses.
  it("says in words what the mood says", async () => {
    render(<Budget />);
    expect(await screen.findByText("1 over budget")).toBeTruthy();
  });

  it("takes its mood from the statuses, not the percentages", async () => {
    mockGetBudgetSummary.mockResolvedValue(
      summaryOf([
        item({ categoryId: 1, categoryName: "Transport", percentUsed: 150, status: "ON_TRACK" }),
        item({ categoryId: 2, categoryName: "Food", percentUsed: 30, status: "WARNING" }),
      ]),
    );
    const { container } = render(<Budget />);
    await screen.findByRole("progressbar", { name: "Food budget" });

    expect(container.querySelector("svg[data-piso-state]")).toHaveAttribute("data-piso-state", "worried");
  });

  it("rests when every budget is on track", async () => {
    mockGetBudgetSummary.mockResolvedValue(
      summaryOf([
        item({ categoryId: 1, categoryName: "Transport", percentUsed: 40 }),
        item({ categoryId: 2, categoryName: "Food", percentUsed: 10 }),
      ]),
    );
    const { container } = render(<Budget />);
    expect(await screen.findByText("All on track")).toBeTruthy();
    expect(container.querySelector("svg[data-piso-state]")).toHaveAttribute("data-piso-state", "resting");
  });
});

describe("Budget month stepper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Only Date is faked, so the promises and findBy timers still run. January pins the year turn.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2027-01-15T04:00:00+08:00"));
    mockGetCategories.mockResolvedValue([]);
    mockGetBudgets.mockResolvedValue([budget()]);
    mockGetBudgetSummary.mockResolvedValue(summaryOf([item()]));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens on the current Manila month, with next disabled", async () => {
    render(<Budget />);

    expect(await screen.findByText("January 2027")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
    expect(mockGetBudgetSummary).toHaveBeenCalledWith("2027-01");
  });

  it("asks both queries for the month before, across the year turn", async () => {
    render(<Budget />);
    await screen.findByText("January 2027");

    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));

    expect(await screen.findByText("December 2026")).toBeTruthy();
    await waitFor(() => expect(mockGetBudgetSummary).toHaveBeenLastCalledWith("2026-12"));
    expect(mockGetBudgets).toHaveBeenLastCalledWith("2026-12");
    expect(screen.getByRole("button", { name: "Next month" })).toBeEnabled();
  });

  it("steps forward again to the current month", async () => {
    render(<Budget />);
    await screen.findByText("January 2027");

    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    await screen.findByText("December 2026");
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));

    expect(await screen.findByText("January 2027")).toBeTruthy();
    await waitFor(() => expect(mockGetBudgets).toHaveBeenLastCalledWith("2027-01"));
  });
});

describe("Budget while a month loads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCategories.mockResolvedValue([]);
    mockGetBudgets.mockResolvedValue([budget()]);
    mockGetBudgetSummary.mockResolvedValue(
      summaryOf([item({ percentUsed: 120, remaining: -10_000, status: "OVER_BUDGET" })]),
    );
  });

  it("lists the budgets without meters when the summary fails", async () => {
    mockGetBudgetSummary.mockRejectedValue(new Error("down"));
    render(<Budget />);

    expect(await screen.findByTitle("Edit")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByText("Failed to load budgets.")).toBeNull();
  });

  // Until the new month answers, the rows on screen are the previous month's: they are marked
  // busy and the mood line, which would describe the wrong month, is withdrawn.
  it("marks the previous month's rows busy after a step", async () => {
    render(<Budget />);
    await screen.findByText("1 over budget");
    expect(screen.getByRole("table").closest("[aria-busy]")).toHaveAttribute("aria-busy", "false");

    mockGetBudgets.mockReturnValue(new Promise(() => {}));
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));

    expect(screen.getByRole("table").closest("[aria-busy]")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("1 over budget")).toBeNull();
  });
});
