import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard, { abbrevCentavos } from "./Dashboard";
import { getBudgetSummary, type BudgetSummaryItem, type BudgetSummaryResponse } from "../api/budgets";
import {
  getCategoryReport,
  getExpensesPage,
  getMonthlyComparison,
  getMonthlyReport,
  type CategoryReport,
  type Expense,
  type ExpensePage,
  type MonthlyComparison,
  type MonthlyReport,
} from "../api/expenses";
import { getUpcomingBills, type UpcomingBillResponse } from "../api/recurring";
import { formatCentavos, formatDate, manilaMonth } from "../lib/formatters";

vi.mock("../api/budgets", () => ({ getBudgetSummary: vi.fn() }));
vi.mock("../api/recurring", () => ({ getUpcomingBills: vi.fn() }));

vi.mock("../api/expenses", () => ({
  getCategoryReport: vi.fn(),
  getExpensesPage: vi.fn(),
  getMonthlyComparison: vi.fn(),
  getMonthlyReport: vi.fn(),
}));

// The child cards each fetch for themselves and carry their own tests. Stubbing them keeps every
// assertion below about markup Dashboard.tsx actually owns.
vi.mock("../components/AiInsightsCard", () => ({ default: () => <div>AiInsightsCard</div> }));
vi.mock("../components/DailyTrendCard", () => ({ default: () => <div>DailyTrendCard</div> }));
vi.mock("../components/GoalProgressCard", () => ({ default: () => <div>GoalProgressCard</div> }));
vi.mock("../components/TopExpensesCard", () => ({ default: () => <div>TopExpensesCard</div> }));
vi.mock("../components/FeatureGate", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
// Real CategoryChip tints its icon from a hex palette, which would show up in the markup scan
// as colour Dashboard did not choose. The stub keeps the name, which is what Dashboard passes.
vi.mock("../components/CategoryChip", () => ({
  default: ({ name }: { name: string }) => <span>{name}</span>,
}));

const mockGetBudgetSummary = vi.mocked(getBudgetSummary);
const mockGetUpcomingBills = vi.mocked(getUpcomingBills);
const mockGetCategoryReport = vi.mocked(getCategoryReport);
const mockGetExpensesPage = vi.mocked(getExpensesPage);
const mockGetMonthlyComparison = vi.mocked(getMonthlyComparison);
const mockGetMonthlyReport = vi.mocked(getMonthlyReport);

// --- Manila calendar, so the expectations move with the clock --------------------------------

const manilaToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
/** `yyyy-mm-dd`, `n` days after Manila's today. */
const daysFromToday = (n: number) => {
  const [y, m, d] = manilaToday().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

const currentMonth = manilaMonth();
const [cy, cm] = currentMonth.split("-").map(Number);
const prevMonth = new Date(Date.UTC(cy, cm - 2, 1)).toISOString().slice(0, 7);
const daysInMonth = new Date(cy, cm, 0).getDate();
// Today counts, as on mobile: the last day of the month is "1 day" left, never 0.
const daysLeft = daysInMonth - Number(manilaToday().slice(8, 10)) + 1;
const leftFor = (centavos: number) =>
  `${formatCentavos(centavos)} left for ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`;
const monthLabel = new Date(cy, cm - 1, 1).toLocaleString("default", {
  month: "short",
  year: "numeric",
});

// --- Fixtures ------------------------------------------------------------------------------

const CATEGORIES: CategoryReport[] = [
  { category: "Groceries", total: 812_345 },
  { category: "Transport", total: 245_000 },
];

const expense = (over: Partial<Expense> = {}): Expense => ({
  id: 1,
  amount: 125_050,
  amountInBaseCurrency: 125_050,
  category: "Groceries",
  currency: "PHP",
  date: "2026-10-01T09:30:00",
  description: "Weekly market run",
  exchangeRate: 1,
  expenseType: "PERSONAL",
  reimbursable: false,
  source: "MANUAL",
  ...over,
});

/** The contract's page envelope, so the fixture is the shape the API actually returns. */
const page = (content: Expense[]): ExpensePage => ({
  content,
  last: true,
  page: 0,
  size: 5,
  totalElements: content.length,
  totalPages: content.length === 0 ? 0 : 1,
});

const EXPENSES: Expense[] = [
  expense(),
  expense({ id: 2, amount: 48_000, category: "Transport", description: "Grab to office", date: "2026-10-02T08:00:00" }),
];

const MONTHLY: MonthlyReport[] = [
  { month: "2026-09", total: 1_500_000 },
  { month: "2026-10", total: 1_157_395 },
];

const MOM: MonthlyComparison = {
  month: currentMonth,
  currentTotal: 1_157_395,
  previousTotal: 1_000_000,
  changePercent: 15.7,
};

const item = (over: Partial<BudgetSummaryItem> = {}): BudgetSummaryItem => ({
  budgeted: 1_500_000,
  categoryId: 1,
  categoryName: "Groceries",
  percentUsed: 54,
  remaining: 687_655,
  spent: 812_345,
  status: "ON_TRACK",
  ...over,
});

const BUDGET: BudgetSummaryResponse = {
  month: currentMonth,
  dailyAllowance: 34_567,
  safeToSpend: 687_655,
  totalBudgeted: 1_500_000,
  totalSpent: 812_345,
  items: [item()],
};

/** Last month went over, so by default nothing celebrates. */
const PREV_BUDGET: BudgetSummaryResponse = {
  ...BUDGET,
  month: prevMonth,
  items: [item({ status: "OVER_BUDGET", percentUsed: 120 })],
};

const bill = (over: Partial<UpcomingBillResponse> = {}): UpcomingBillResponse => ({
  id: 7,
  name: "Netflix",
  amount: 54_900,
  amountInBaseCurrency: 54_900,
  categoryName: "Subscriptions",
  currency: "PHP",
  dueDate: daysFromToday(3),
  frequency: "MONTHLY",
  ...over,
});

const budgets = (current: BudgetSummaryResponse, previous: BudgetSummaryResponse = PREV_BUDGET) =>
  mockGetBudgetSummary.mockImplementation((m: string) =>
    Promise.resolve(m === prevMonth ? previous : { ...current, month: m }),
  );

const text = (el: Element) => el.textContent ?? "";
const section = (name: string) => document.querySelector(`[data-section="${name}"]`) as HTMLElement | null;
const hero = () => document.querySelector("div.bg-hero") as HTMLElement;
const pisoStates = () =>
  [...document.querySelectorAll("[data-piso-state]")].map((el) => el.getAttribute("data-piso-state"));

describe("abbrevCentavos", () => {
  it("renders full precision below the 100,000-centavo threshold", () => {
    expect(abbrevCentavos(99_999)).toBe("₱999.99");
    expect(abbrevCentavos(45_050)).toBe("₱450.5");
  });

  it("switches to thousands exactly at the threshold", () => {
    expect(abbrevCentavos(100_000)).toBe("₱1k");
  });

  it("drops a trailing zero in the thousands form", () => {
    expect(abbrevCentavos(1_250_000)).toBe("₱12.5k");
  });

  it("keeps both decimals when neither is a trailing zero", () => {
    expect(abbrevCentavos(1_234_500)).toBe("₱12.35k");
  });

  it("renders whole thousands without a decimal point", () => {
    expect(abbrevCentavos(10_000_000)).toBe("₱100k");
  });

  it("renders zero without a decimal point", () => {
    expect(abbrevCentavos(0)).toBe("₱0");
  });

  it("keeps the sign on a negative amount, in both branches", () => {
    expect(abbrevCentavos(-1_250_000)).toBe("-₱12.5k");
    expect(abbrevCentavos(-45_050)).toBe("-₱450.5");
  });

  it("never trims a zero that sits before the decimal point", () => {
    // ₱1,000.00 and ₱100.00 are the values a bare /\.?0+$/ would eat into.
    expect(abbrevCentavos(100_000_000)).toBe("₱1,000k");
    expect(abbrevCentavos(99_000)).toBe("₱990");
  });
});

// ---------------------------------------------------------------------------
// Render tests. Expectations are derived from the fixture, never copied out of the JSX.
// ---------------------------------------------------------------------------

describe("Dashboard render", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetCategoryReport.mockResolvedValue(CATEGORIES);
    mockGetExpensesPage.mockResolvedValue(page(EXPENSES));
    mockGetMonthlyReport.mockResolvedValue(MONTHLY);
    mockGetMonthlyComparison.mockResolvedValue(MOM);
    mockGetUpcomingBills.mockResolvedValue([]);
    budgets(BUDGET);
  });

  afterEach(() => vi.useRealTimers());

  const mount = () =>
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

  const setup = async () => {
    const view = mount();
    await screen.findByText(new RegExp(`Total Spend · ${monthLabel}`));
    return view;
  };

  // --- Hero ---------------------------------------------------------------

  it("leads with the month's spend, Piso at 96px beside it, and a meter against the total budget", async () => {
    await setup();

    expect(text(hero())).toContain(formatCentavos(MOM.currentTotal));
    const piso = hero().querySelector("[data-piso-state]")!;
    expect(piso.getAttribute("width")).toBe("96");
    expect(piso.getAttribute("data-piso-state")).toBe("resting");

    const meter = within(hero()).getByRole("progressbar", { name: "Month budget" });
    // 812,345 of 1,500,000 centavos is 54%.
    expect(meter).toHaveAttribute("aria-valuenow", "54");
    // The hero figure is all of this month's spend; the meter counts budgeted categories only
    // (BudgetService sums `totalSpent` over budget lines), so the caption has to say so.
    expect(text(hero())).toContain(
      `${formatCentavos(BUDGET.totalSpent)} of ${formatCentavos(BUDGET.totalBudgeted)} budgeted · 54%`,
    );
    expect(text(hero())).toContain("₱8,123.45 of ₱15,000.00 budgeted · 54%");
  });

  it.each([
    ["ON_TRACK", "resting", (): string => leftFor(BUDGET.safeToSpend)],
    ["WARNING", "worried", (): string => `Heads up: ${leftFor(BUDGET.safeToSpend)}`],
  ] as const)("ties the status line to the mood when the worst budget is %s", async (status, mood, line) => {
    budgets({ ...BUDGET, items: [item(), item({ categoryId: 2, categoryName: "Food", status })] });
    await setup();

    expect(hero().querySelector("[data-piso-state]")).toHaveAttribute("data-piso-state", mood);
    expect(within(hero()).getByTestId("hero-status")).toHaveTextContent(line());
  });

  it("says by how much the month is over, in amber words, when spend passes the total budget", async () => {
    budgets({
      ...BUDGET,
      safeToSpend: -120_000,
      items: [item({ status: "OVER_BUDGET", percentUsed: 108 })],
    });
    await setup();

    expect(hero().querySelector("[data-piso-state]")).toHaveAttribute("data-piso-state", "overBudget");
    expect(within(hero()).getByTestId("hero-status")).toHaveTextContent(`Over by ${formatCentavos(120_000)}`);
  });

  it("names an over-budget line even while the month as a whole is still under", async () => {
    budgets({ ...BUDGET, items: [item(), item({ categoryId: 2, categoryName: "Food", status: "OVER_BUDGET" })] });
    await setup();

    expect(hero().querySelector("[data-piso-state]")).toHaveAttribute("data-piso-state", "overBudget");
    expect(within(hero()).getByTestId("hero-status")).toHaveTextContent(
      `Food is over budget · ${leftFor(BUDGET.safeToSpend)}`,
    );
  });

  it("counts today in the days left, so the last day of the month reads 1 day", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-31T04:00:00Z")); // noon, 31 Oct, Manila
    mount();

    expect(await screen.findByTestId("hero-status")).toHaveTextContent(
      `${formatCentavos(BUDGET.safeToSpend)} left for 1 day`,
    );
  });

  it("asks for a budget, without a meter, when there are expenses but no budgets", async () => {
    budgets({ ...BUDGET, items: [] });
    await setup();

    expect(hero().querySelector("[data-piso-state]")).toHaveAttribute("data-piso-state", "resting");
    expect(within(hero()).queryByRole("progressbar")).toBeNull();
    expect(within(hero()).getByTestId("hero-status")).toHaveTextContent("No budget yet");
    expect(within(hero()).getByRole("link", { name: /set one/i })).toHaveAttribute("href", "/budget");
  });

  it("survives the budget endpoint failing outright", async () => {
    mockGetBudgetSummary.mockRejectedValue(new Error("no budget service"));
    await setup();

    expect(within(hero()).getByTestId("hero-status")).toHaveTextContent("No budget yet");
  });

  it("shows an empty Piso and one line when nothing is logged and no budget is set", async () => {
    budgets({ ...BUDGET, items: [] });
    mockGetExpensesPage.mockResolvedValue(page([]));
    mockGetMonthlyComparison.mockResolvedValue({ ...MOM, currentTotal: 0 });
    await setup();

    expect(pisoStates()).toEqual(["empty"]);
    expect(within(hero()).getByTestId("hero-status")).toHaveTextContent("Nothing logged yet");
  });

  // --- Needs attention ----------------------------------------------------

  it("hides Needs attention when no budget is warning and no bill is due within 7 days", async () => {
    mockGetUpcomingBills.mockResolvedValue([bill({ dueDate: daysFromToday(8) })]);
    await setup();

    expect(screen.queryByRole("heading", { name: "Needs attention" })).toBeNull();
    expect(section("attention")).toBeNull();
  });

  it("merges WARNING and OVER_BUDGET budgets with bills due within 7 days", async () => {
    budgets({
      ...BUDGET,
      items: [
        item({ categoryId: 1, categoryName: "Groceries", status: "ON_TRACK" }),
        item({ categoryId: 2, categoryName: "Food", status: "WARNING", percentUsed: 30 }),
        item({ categoryId: 3, categoryName: "Fun", status: "OVER_BUDGET", percentUsed: 104 }),
      ],
    });
    const due = [
      bill({ id: 7, name: "Netflix", dueDate: daysFromToday(0) }),
      bill({ id: 8, name: "Rent", dueDate: daysFromToday(7) }),
      bill({ id: 9, name: "Gym", dueDate: daysFromToday(8) }),
      bill({ id: 10, name: "Paid already", dueDate: daysFromToday(-1) }),
    ];
    // The endpoint is per month, so near a month end the window spans two calls.
    mockGetUpcomingBills.mockImplementation((m: string) =>
      Promise.resolve(due.filter((b) => b.dueDate.startsWith(m))),
    );
    await setup();

    expect(screen.getByRole("heading", { name: "Needs attention" })).toBeInTheDocument();
    const rows = within(section("attention")!).getAllByRole("listitem").map(text);
    // The server's band, never the percentage: Food is amber at 30% because the server says so.
    expect(rows.some((r) => r.includes("Fun") && r.includes("104%"))).toBe(true);
    expect(rows.some((r) => r.includes("Food") && r.includes("30%"))).toBe(true);
    expect(rows.some((r) => r.includes("Netflix") && r.includes(formatCentavos(54_900)))).toBe(true);
    expect(rows.some((r) => r.includes("Rent"))).toBe(true);
    expect(rows.join()).not.toMatch(/Groceries|Gym|Paid already/);
    expect(rows).toHaveLength(4);
    // Over budget leads, then warnings, then bills by due date.
    expect(rows[0]).toContain("Fun");
    expect(rows[1]).toContain("Food");
    expect(rows[2]).toContain("Netflix");
  });

  it("asks for next month's bills too when the 7-day window crosses the month end", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-28T04:00:00Z")); // noon, 28 Oct, Manila
    mount();

    await waitFor(() => expect(mockGetUpcomingBills).toHaveBeenCalledWith("2026-11"));
    expect(mockGetUpcomingBills).toHaveBeenCalledWith("2026-10");
  });

  it("asks for this month's bills only when the window stays inside it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-10T04:00:00Z"));
    mount();

    await waitFor(() => expect(mockGetUpcomingBills).toHaveBeenCalledWith("2026-10"));
    expect(mockGetUpcomingBills).toHaveBeenCalledTimes(1);
  });

  // --- Goals, recent, insights --------------------------------------------

  it("renders the goals strip", async () => {
    await setup();
    expect(screen.getByText("GoalProgressCard")).toBeInTheDocument();
  });

  it("shows the last five expenses, each with amount, category and date, and a See all link", async () => {
    const many = Array.from({ length: 7 }, (_, i) => expense({ id: 100 + i, description: `Row ${i}` }));
    mockGetExpensesPage.mockResolvedValue(page(many));
    await setup();

    expect(mockGetExpensesPage).toHaveBeenCalledWith({ page: 0, size: 5 });
    const recent = within(section("recent")!);
    expect(recent.getByRole("heading", { name: "Recent" })).toBeInTheDocument();
    expect(recent.getByText("Row 4")).toBeInTheDocument();
    expect(recent.queryByText("Row 5")).not.toBeInTheDocument();
    expect(recent.getAllByText(formatCentavos(many[0].amount))).toHaveLength(5);
    expect(recent.getAllByText(formatDate(many[0].date))).toHaveLength(5);
    expect(recent.getByRole("link", { name: "See all" })).toHaveAttribute("href", "/expenses");
  });

  it("says so in words, with no second Piso, when there are no expenses", async () => {
    mockGetExpensesPage.mockResolvedValue(page([]));
    await setup();

    expect(within(section("recent")!).getByText("No expenses yet")).toBeInTheDocument();
    expect(section("recent")!.querySelector("[data-piso-state]")).toBeNull();
  });

  it("keeps trend, top expenses and AI insights in an Insights section that starts collapsed", async () => {
    await setup();

    const toggle = screen.getByRole("button", { name: /Insights/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    for (const hidden of ["AiInsightsCard", "DailyTrendCard", "TopExpensesCard", "Monthly Trend"]) {
      expect(screen.queryByText(hidden)).not.toBeInTheDocument();
    }

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    for (const shown of ["AiInsightsCard", "DailyTrendCard", "TopExpensesCard", "Monthly Trend", "Spending by Category"]) {
      expect(screen.getByText(shown)).toBeInTheDocument();
    }
    const categories = within(section("categories")!);
    for (const c of CATEGORIES) {
      expect(categories.getByText(formatCentavos(c.total))).toBeInTheDocument();
    }
  });

  // --- Month closed under budget ------------------------------------------

  it("celebrates once, in the hero, when last month closed with no budget over", async () => {
    budgets(BUDGET, { ...PREV_BUDGET, items: [item(), item({ categoryId: 2, status: "WARNING" })] });
    const first = await setup();

    expect(pisoStates()).toEqual(["cheer"]);
    expect(hero().querySelector('[data-testid="coin"]')).not.toBeNull();
    expect(localStorage.getItem(`ga.celebrate.anon.month-${prevMonth}`)).toBe("1");
    first.unmount();

    await setup();
    expect(pisoStates()).toEqual(["resting"]);
    expect(document.querySelector('[data-testid="coin"]')).toBeNull();
  });

  it.each([
    ["a budget line closed over", PREV_BUDGET],
    ["last month had no budgets", { ...PREV_BUDGET, items: [] }],
  ])("does not celebrate when %s", async (_, previous) => {
    budgets(BUDGET, previous);
    await setup();

    expect(document.querySelector('[data-testid="coin"]')).toBeNull();
    expect(pisoStates()).toEqual(["resting"]);
  });

  // --- Structure ----------------------------------------------------------

  it("keeps to one Piso on the loaded page", async () => {
    mockGetUpcomingBills.mockResolvedValue([bill()]);
    await setup();
    expect(pisoStates()).toHaveLength(1);
  });

  it("keeps no hardcoded hex colour anywhere in the loaded page", async () => {
    const { container } = await setup();
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{6}/);
  });

  it("offers a retry when the page fails to load, with no raw hex in the markup", async () => {
    mockGetCategoryReport.mockRejectedValue(new Error("down"));
    const { container } = mount();

    expect(await screen.findByText("Failed to load dashboard data.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{6}/);
  });

  it("re-fetches when an expense, budget or bill changes elsewhere in the app", async () => {
    await setup();
    expect(mockGetExpensesPage).toHaveBeenCalledTimes(1);

    for (const event of ["gastosai:expense-changed", "gastosai:budget-changed", "gastosai:recurring-changed"]) {
      await act(async () => {
        window.dispatchEvent(new Event(event));
      });
    }

    expect(mockGetExpensesPage).toHaveBeenCalledTimes(4);
  });

  it("asks for the new Manila month on a refetch after midnight on the 1st", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-30T15:30:00Z")); // 23:30 Manila, 30 Sep
    mount();
    await waitFor(() => expect(mockGetMonthlyComparison).toHaveBeenLastCalledWith("2026-09"));
    expect(mockGetBudgetSummary).toHaveBeenCalledWith("2026-09");

    vi.setSystemTime(new Date("2026-09-30T16:30:00Z")); // 00:30 Manila, 1 Oct
    await act(async () => {
      window.dispatchEvent(new Event("gastosai:expense-changed"));
    });

    expect(mockGetMonthlyComparison).toHaveBeenLastCalledWith("2026-10");
    expect(mockGetBudgetSummary).toHaveBeenCalledWith("2026-10");
    // ...and last month, for the closed-under-budget check, is now September.
    expect(mockGetBudgetSummary).toHaveBeenCalledWith("2026-09");
  });

  it("renders a skeleton, not a figure, before the data lands", () => {
    mockGetCategoryReport.mockReturnValue(new Promise(() => {}));
    const { container } = mount();

    expect(container.querySelector(".animate-pulse")).toBeTruthy();
    expect(screen.queryByText(`Total Spend · ${monthLabel}`)).not.toBeInTheDocument();
  });
});
