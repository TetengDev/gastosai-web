import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useEffect } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard, { abbrevCentavos } from "./Dashboard";
import { AuthProvider } from "../context/AuthContext";
import { celebrationKey } from "../lib/celebrateStore";
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
import {
  getRecurring,
  getUpcomingBills,
  markRecurringPaid,
  type RecurringExpenseResponse,
  type UpcomingBillResponse,
} from "../api/recurring";
import { formatCentavos, formatDate, formatDayMonth, manilaMonth } from "../lib/formatters";

vi.mock("../api/budgets", () => ({ getBudgetSummary: vi.fn() }));
vi.mock("../api/recurring", () => ({
  getRecurring: vi.fn(),
  getUpcomingBills: vi.fn(),
  markRecurringPaid: vi.fn(),
}));

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
// The goals strip reports its COMPLETED goals up so the hero can queue their celebrations; the
// stub reports whatever the test puts in `goalStrip.completed`.
const goalStrip = vi.hoisted(() => ({ completed: [] as string[] }));
vi.mock("../components/GoalProgressCard", () => ({
  default: function GoalStripStub({ onCompleted }: { onCompleted?: (events: string[]) => void }) {
    useEffect(() => onCompleted?.(goalStrip.completed), [onCompleted]);
    return <div>GoalProgressCard</div>;
  },
}));
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
const mockGetRecurring = vi.mocked(getRecurring);
const mockMarkRecurringPaid = vi.mocked(markRecurringPaid);
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
/** Noon in Manila on `day` of the fixtures' month, for tests that fake the clock. The fixtures
 *  are keyed to the real month, so a hard-coded date only agrees with them in that month. */
const noonManilaOn = (day: number) => new Date(Date.UTC(cy, cm - 1, day, 4));
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
  // The server's figure, deliberately not 812,345 / 1,500,000 (54%): the hero must show this one.
  percentUsed: 61,
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

/** The paid state lives on `/recurring` only (R2), joined to the upcoming bills by id. */
const recurring = (over: Partial<RecurringExpenseResponse> = {}): RecurringExpenseResponse => ({
  id: 7,
  name: "Meralco",
  amount: 254_900,
  amountInBaseCurrency: 254_900,
  categoryName: "Utilities",
  currency: "PHP",
  exchangeRate: 1,
  frequency: "MONTHLY",
  dayOfMonth: 10,
  dayOfWeek: null,
  monthOfYear: null,
  active: true,
  paidThisMonth: false,
  lastPaidMonth: "2026-10",
  ...over,
});

const meralco = (dueDate: string) => bill({ id: 7, name: "Meralco", amount: 254_900, dueDate });

/** The upcoming endpoint is per month; each month answers with its own occurrences. */
const upcomingByMonth = (byMonth: Record<string, UpcomingBillResponse[]>) =>
  mockGetUpcomingBills.mockImplementation((m: string) => Promise.resolve(byMonth[m] ?? []));

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

const ACCOUNT = "a@example.com";

describe("Dashboard render", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    goalStrip.completed = [];
    // Celebrations are per account; AuthContext reads this session at startup.
    localStorage.setItem("token", "t");
    localStorage.setItem("auth_user", JSON.stringify({ email: ACCOUNT, name: "A", role: "USER" }));
    mockGetCategoryReport.mockResolvedValue(CATEGORIES);
    mockGetExpensesPage.mockResolvedValue(page(EXPENSES));
    mockGetMonthlyReport.mockResolvedValue(MONTHLY);
    mockGetMonthlyComparison.mockResolvedValue(MOM);
    mockGetUpcomingBills.mockResolvedValue([]);
    mockGetRecurring.mockResolvedValue([]);
    budgets(BUDGET);
  });

  afterEach(() => vi.useRealTimers());

  const mount = () =>
    render(
      <AuthProvider>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </AuthProvider>,
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
    // The server's `percentUsed`, never the client's 812,345 / 1,500,000 (54%).
    expect(meter).toHaveAttribute("aria-valuenow", "61");
    // The hero figure is all of this month's spend; the meter counts budgeted categories only
    // (BudgetService sums `totalSpent` over budget lines), so the caption has to say so.
    expect(text(hero())).toContain(
      `${formatCentavos(BUDGET.totalSpent)} of ${formatCentavos(BUDGET.totalBudgeted)} budgeted · 61%`,
    );
    expect(text(hero())).toContain("₱8,123.45 of ₱15,000.00 budgeted · 61%");
  });

  it("keeps its own guard: no meter when nothing is budgeted, since the server's 0 also means nothing spent", async () => {
    budgets({ ...BUDGET, totalBudgeted: 0, percentUsed: 0 });
    await setup();

    expect(within(hero()).queryByRole("progressbar", { name: "Month budget" })).toBeNull();
  });

  it.each([
    ["ON_TRACK", "resting", (): string => leftFor(BUDGET.safeToSpend)],
    ["WARNING", "worried", (): string => `Close to the limit · ${leftFor(BUDGET.safeToSpend)}`],
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
    expect(within(hero()).getByTestId("hero-status").textContent).toBe(`Over by ${formatCentavos(120_000)}`);
  });

  it("says a budget ran over even while the month as a whole is still under", async () => {
    budgets({ ...BUDGET, items: [item(), item({ categoryId: 2, categoryName: "Food", status: "OVER_BUDGET" })] });
    await setup();

    expect(hero().querySelector("[data-piso-state]")).toHaveAttribute("data-piso-state", "overBudget");
    expect(within(hero()).getByTestId("hero-status")).toHaveTextContent(
      `A budget ran over · ${leftFor(BUDGET.safeToSpend)}`,
    );
  });

  it("counts today in the days left, so the last day of the month reads 1 day", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(noonManilaOn(daysInMonth)); // the last day of the month
    mount();

    expect(await screen.findByTestId("hero-status")).toHaveTextContent(
      `${formatCentavos(BUDGET.safeToSpend)} left for 1 day`,
    );
  });

  it("counts the day of the month in Manila, not the browser's zone, at 00:30 on 1 Oct", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-30T16:30:00Z")); // 00:30 Manila, 1 Oct; still 30 Sep in UTC
    // Keyed to literal months, not the fixtures' real-month helpers, so this holds in any month.
    mockGetBudgetSummary.mockImplementation((m: string) =>
      Promise.resolve(m === "2026-10" ? { ...BUDGET, month: m } : { ...PREV_BUDGET, month: m }),
    );
    mount();

    // Day 1 of October: today counts, so 31 days are left, not September's last 1.
    expect(await screen.findByTestId("hero-status")).toHaveTextContent(
      `${formatCentavos(BUDGET.safeToSpend)} left for 31 days`,
    );
    expect(text(hero())).toMatch(/Total Spend · Oct 2026/);
  });

  it("asks for a budget, without a meter, when there are expenses but no budgets", async () => {
    budgets({ ...BUDGET, items: [] });
    await setup();

    expect(hero().querySelector("[data-piso-state]")).toHaveAttribute("data-piso-state", "resting");
    expect(within(hero()).queryByRole("progressbar")).toBeNull();
    expect(within(hero()).getByTestId("hero-status")).toHaveTextContent("No budget set for this month.");
    expect(within(hero()).getByRole("link", { name: /set one/i })).toHaveAttribute("href", "/budget");
  });

  it("survives the budget endpoint failing outright", async () => {
    mockGetBudgetSummary.mockRejectedValue(new Error("no budget service"));
    await setup();

    expect(within(hero()).getByTestId("hero-status")).toHaveTextContent("No budget set for this month.");
  });

  it("shows an empty Piso and one line when nothing is logged and no budget is set", async () => {
    budgets({ ...BUDGET, items: [] });
    mockGetExpensesPage.mockResolvedValue(page([]));
    mockGetMonthlyComparison.mockResolvedValue({ ...MOM, currentTotal: 0 });
    await setup();

    expect(pisoStates()).toEqual(["empty"]);
    expect(within(hero()).getByTestId("hero-status")).toHaveTextContent("Nothing logged yet");
  });

  // Spec §5: the status line per mood, exact, so web and mobile cannot drift apart again.
  it.each([
    ["resting", { ...BUDGET }, true, (): string => leftFor(BUDGET.safeToSpend)],
    [
      "worried",
      { ...BUDGET, items: [item({ status: "WARNING" })] },
      true,
      (): string => `Close to the limit · ${leftFor(BUDGET.safeToSpend)}`,
    ],
    [
      "overBudget",
      { ...BUDGET, items: [item({ status: "OVER_BUDGET" })] },
      true,
      (): string => `A budget ran over · ${leftFor(BUDGET.safeToSpend)}`,
    ],
    [
      "overBudget",
      { ...BUDGET, safeToSpend: -120_000, items: [item({ status: "OVER_BUDGET" })] },
      true,
      (): string => `Over by ${formatCentavos(120_000)}`,
    ],
        // R2: word for word with mobile Home, then web's own link to set one.
    ["resting", { ...BUDGET, items: [] }, true, (): string => "No budget set for this month. Set one"],
    [
      "empty",
      { ...BUDGET, items: [] },
      false,
      (): string => "Nothing logged yet. Your first expense goes straight into Piso's slot.",
    ],
  ] as const)("pins the %s status line exactly", async (mood, current, hasExpenses, line) => {
    budgets(current as BudgetSummaryResponse);
    if (!hasExpenses) mockGetExpensesPage.mockResolvedValue(page([]));
    await setup();

    expect(hero().querySelector("[data-piso-state]")).toHaveAttribute("data-piso-state", mood);
    expect(within(hero()).getByTestId("hero-status").textContent).toBe(line());
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
    // An over meter is a ring and a gap around the bar, so it needs at least 6px to show one.
    const over = within(section("attention")!).getByRole("progressbar", { name: "Fun budget" });
    expect(parseFloat(over.style.height)).toBeGreaterThanOrEqual(6);
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
    // ...and last month, for the unpaid-last-month check (R3).
    expect(mockGetUpcomingBills).toHaveBeenCalledWith("2026-09");
  });

  it("lists a bill once when both months' responses carry the same occurrence", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(noonManilaOn(daysInMonth - 3)); // the 7-day window crosses the month end
    mockGetUpcomingBills.mockResolvedValue([
      bill({ id: 7, name: "Netflix", dueDate: `${currentMonth}-${String(daysInMonth - 1).padStart(2, "0")}` }),
    ]);
    mount();

    await screen.findByRole("heading", { name: "Needs attention" });
    // This month, next month, and last month for the unpaid-last-month check.
    expect(mockGetUpcomingBills).toHaveBeenCalledTimes(3);
    expect(within(section("attention")!).getAllByRole("listitem")).toHaveLength(1);
  });

  it("asks for this month's bills only when the window stays inside it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-10T04:00:00Z"));
    mount();

    await waitFor(() => expect(mockGetUpcomingBills).toHaveBeenCalledWith("2026-10"));
    expect(mockGetUpcomingBills).toHaveBeenCalledWith("2026-09"); // last month, for R3
    expect(mockGetUpcomingBills).toHaveBeenCalledTimes(2);
  });

  // --- Overdue bills (contract 3.5.0) ---------------------------------------
  // The clock is faked in Manila; `mount()` rather than `setup()`, which waits on the real month.

  describe("overdue bills", () => {
    const attentionRows = () =>
      section("attention") ? within(section("attention")!).getAllByRole("listitem").map(text) : [];
    /** Waits for the page, so an absent row means absent, not still loading. */
    const loaded = async (at: string) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(at));
      mount();
      await screen.findByTestId("hero-status");
    };

    it("keeps an unpaid bill whose due date this month has passed, marked overdue, above the upcoming ones", async () => {
      upcomingByMonth({
        "2026-11": [meralco("2026-11-10"), bill({ id: 8, name: "Netflix", dueDate: "2026-11-18" })],
      });
      mockGetRecurring.mockResolvedValue([recurring(), recurring({ id: 8, name: "Netflix" })]);
      await loaded("2026-11-18T04:00:00Z"); // noon, 18 Nov, Manila

      const rows = attentionRows();
      expect(rows).toHaveLength(2);
      expect(rows[0]).toContain("Meralco");
      expect(rows[0]).toContain(`Overdue · was due ${formatDayMonth("2026-11-10T00:00:00+08:00")}`);
      // Due today is not overdue yet.
      expect(rows[1]).toContain("Netflix");
      expect(rows[1]).toContain("Due today");
    });

    it("shows no row for a bill marked paid this month, past or upcoming (R5)", async () => {
      upcomingByMonth({ "2026-11": [meralco("2026-11-10"), meralco("2026-11-20")] });
      mockGetRecurring.mockResolvedValue([recurring({ paidThisMonth: true, lastPaidMonth: "2026-11" })]);
      await loaded("2026-11-18T04:00:00Z");

      expect(screen.queryByRole("heading", { name: "Needs attention" })).toBeNull();
    });

    it("flags a bill left unpaid last month, once it had an occurrence there", async () => {
      upcomingByMonth({ "2026-11": [meralco("2026-11-20")], "2026-10": [meralco("2026-10-20")] });
      mockGetRecurring.mockResolvedValue([recurring({ lastPaidMonth: "2026-09" })]);
      await loaded("2026-11-03T04:00:00Z");

      const rows = attentionRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toContain("Meralco");
      expect(rows[0]).toContain("Overdue · not paid last month");
    });

    it("flags nothing when the bill is marked paid for a later month", async () => {
      upcomingByMonth({ "2026-11": [meralco("2026-11-10")] });
      mockGetRecurring.mockResolvedValue([recurring({ paidThisMonth: false, lastPaidMonth: "2026-12" })]);
      await loaded("2026-11-18T04:00:00Z");

      expect(screen.queryByRole("heading", { name: "Needs attention" })).toBeNull();
    });

    it("still lists next month's row for a bill paid this month, with no action (R5, R6)", async () => {
      upcomingByMonth({ "2026-11": [meralco("2026-11-01")] });
      mockGetRecurring.mockResolvedValue([recurring({ paidThisMonth: true, lastPaidMonth: "2026-10" })]);
      await loaded("2026-10-28T04:00:00Z");

      // Budget rows may share the list (the fixtures' last month can land on October), so count bills.
      expect(attentionRows().filter((r) => r.includes("Meralco"))).toHaveLength(1);
      expect(screen.queryByRole("button", { name: "Mark Meralco paid" })).toBeNull();
    });

    it("does not flag a never-marked bill for last month, on the 1st (R1)", async () => {
      upcomingByMonth({ "2026-11": [meralco("2026-11-20")], "2026-10": [meralco("2026-10-20")] });
      mockGetRecurring.mockResolvedValue([recurring({ lastPaidMonth: null })]);
      await loaded("2026-11-01T04:00:00Z");

      expect(screen.queryByRole("heading", { name: "Needs attention" })).toBeNull();
    });

    it("does not flag a yearly bill that had no occurrence last month (R3)", async () => {
      upcomingByMonth({ "2026-11": [meralco("2026-11-20")] });
      mockGetRecurring.mockResolvedValue([recurring({ frequency: "YEARLY", lastPaidMonth: "2026-01" })]);
      await loaded("2026-11-03T04:00:00Z");

      expect(screen.queryByRole("heading", { name: "Needs attention" })).toBeNull();
    });

    it("shows one row per overdue bill, at its most recent missed date, replacing its upcoming rows (R4)", async () => {
      upcomingByMonth({ "2026-11": ["2026-11-04", "2026-11-11", "2026-11-18"].map(meralco) });
      mockGetRecurring.mockResolvedValue([recurring({ frequency: "WEEKLY" })]);
      await loaded("2026-11-18T04:00:00Z");

      const rows = attentionRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toContain(`Overdue · was due ${formatDayMonth("2026-11-11T00:00:00+08:00")}`);
    });

    it("falls back to upcoming rows only when the bill list fails to load (R2)", async () => {
      upcomingByMonth({
        "2026-11": [meralco("2026-11-10"), bill({ id: 8, name: "Netflix", dueDate: "2026-11-21" })],
      });
      mockGetRecurring.mockRejectedValue(new Error("down"));
      await loaded("2026-11-18T04:00:00Z");

      const rows = attentionRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toContain("Netflix");
      expect(rows[0]).toContain("Due in 3 days");
    });

    // --- Mark paid ------------------------------------------------------------

    /** The server's paid state, flipped by a successful mark, so any number of refetches agree. */
    const serverMarks = (fail = false) => {
      let paid = false;
      mockGetRecurring.mockImplementation(() =>
        Promise.resolve([recurring(paid ? { paidThisMonth: true, lastPaidMonth: "2026-11" } : {})]),
      );
      mockMarkRecurringPaid.mockImplementation(() => {
        if (fail) return Promise.reject(new Error("down"));
        paid = true;
        return Promise.resolve();
      });
    };

    it("offers Mark paid on overdue rows and on upcoming rows due this month, outside the row's link", async () => {
      upcomingByMonth({
        "2026-11": [meralco("2026-11-10"), bill({ id: 8, name: "Netflix", dueDate: "2026-11-20" })],
      });
      mockGetRecurring.mockResolvedValue([recurring(), recurring({ id: 8, name: "Netflix" })]);
      await loaded("2026-11-18T04:00:00Z");

      for (const name of ["Meralco", "Netflix"]) {
        const button = screen.getByRole("button", { name: `Mark ${name} paid` });
        expect(button).toHaveTextContent("Mark paid");
        // A button inside a link would navigate; it sits beside it instead.
        expect(button.closest("a")).toBeNull();
      }
    });

    it("marks the bill paid for this Manila month and drops the row without a reload", async () => {
      upcomingByMonth({ "2026-11": [meralco("2026-11-10")] });
      serverMarks();
      await loaded("2026-11-18T04:00:00Z");

      fireEvent.click(screen.getByRole("button", { name: "Mark Meralco paid" }));

      await waitFor(() => expect(screen.queryByRole("heading", { name: "Needs attention" })).toBeNull());
      expect(mockMarkRecurringPaid).toHaveBeenCalledTimes(1);
      expect(mockMarkRecurringPaid).toHaveBeenCalledWith(7, "2026-11");
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("sends one mark for a double click while the first is in flight", async () => {
      upcomingByMonth({ "2026-11": [meralco("2026-11-10")] });
      mockGetRecurring.mockResolvedValue([recurring()]);
      mockMarkRecurringPaid.mockReturnValue(new Promise(() => {}));
      await loaded("2026-11-18T04:00:00Z");

      const button = screen.getByRole("button", { name: "Mark Meralco paid" });
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockMarkRecurringPaid).toHaveBeenCalledTimes(1);
    });

    it("says so inline, and keeps the row, when marking fails", async () => {
      upcomingByMonth({ "2026-11": [meralco("2026-11-10")] });
      serverMarks(true);
      await loaded("2026-11-18T04:00:00Z");

      fireEvent.click(screen.getByRole("button", { name: "Mark Meralco paid" }));

      const alert = await within(section("attention")!).findByRole("alert");
      expect(alert).toHaveTextContent("Could not mark that bill paid. Try again.");
      expect(attentionRows().some((r) => r.includes("Meralco"))).toBe(true);
      // The next attempt clears it.
      mockMarkRecurringPaid.mockReturnValue(new Promise(() => {}));
      fireEvent.click(screen.getByRole("button", { name: "Mark Meralco paid" }));
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("offers no Mark paid on a row due next month, since the mark covers this month only (R6)", async () => {
      upcomingByMonth({
        "2026-10": [bill({ id: 8, name: "Netflix", dueDate: "2026-10-30" })],
        "2026-11": [meralco("2026-11-01")],
      });
      mockGetRecurring.mockResolvedValue([recurring(), recurring({ id: 8, name: "Netflix" })]);
      await loaded("2026-10-28T04:00:00Z");

      expect(attentionRows().some((r) => r.includes("Meralco"))).toBe(true);
      expect(screen.queryByRole("button", { name: "Mark Meralco paid" })).toBeNull();
      expect(screen.getByRole("button", { name: "Mark Netflix paid" })).toBeInTheDocument();
    });
  });

  // --- Goals, recent, insights --------------------------------------------

  it("renders the goals strip", async () => {
    await setup();
    expect(screen.getByText("GoalProgressCard")).toBeInTheDocument();
  });

  it("shows the last five expenses, each with amount, category and date, and a See all expenses link", async () => {
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
    const seeAll = recent.getByRole("link", { name: "See all expenses" });
    expect(seeAll).toHaveAttribute("href", "/expenses");
    // Visible text and accessible name agree: no aria-label hiding a bare "See all".
    expect(seeAll).toHaveTextContent(/^See all expenses$/);
    expect(seeAll).not.toHaveAttribute("aria-label");
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
    // It points at the panel only while the panel exists.
    expect(toggle).not.toHaveAttribute("aria-controls");
    for (const hidden of ["AiInsightsCard", "DailyTrendCard", "TopExpensesCard", "Monthly Trend"]) {
      expect(screen.queryByText(hidden)).not.toBeInTheDocument();
    }

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls", "insights-panel");
    expect(document.getElementById("insights-panel")).not.toBeNull();
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
    const closed = new Date(cy, cm - 2, 1).toLocaleString("default", { month: "long" });
    expect(within(hero()).getByTestId("hero-status").textContent).toBe(
      `${closed} closed under budget. Nice one.`,
    );
    expect(localStorage.getItem(celebrationKey(ACCOUNT, `month-${prevMonth}`))).toBe("1");
    first.unmount();

    await setup();
    expect(pisoStates()).toEqual(["resting"]);
    expect(document.querySelector('[data-testid="coin"]')).toBeNull();
  });

  // TEN-504: a cheer visit still says when this month is over; the cheer line must not hide it.
  it("shows the cheer line and this month's Over by on a cheer visit that is over budget", async () => {
    budgets(
      { ...BUDGET, safeToSpend: -120_000, items: [item({ status: "OVER_BUDGET", percentUsed: 108 })] },
      { ...PREV_BUDGET, items: [item()] },
    );
    await setup();

    const closed = new Date(cy, cm - 2, 1).toLocaleString("default", { month: "long" });
    expect(within(hero()).getByTestId("hero-status").textContent).toBe(`${closed} closed under budget. Nice one.`);
    const over = within(hero()).getByText(`Over by ${formatCentavos(120_000)}`);
    expect(over).toHaveClass("text-warn-ink");
  });

  it("adds no Over by line on a cheer visit that is still under budget", async () => {
    budgets(BUDGET, { ...PREV_BUDGET, items: [item()] });
    await setup();
    expect(within(hero()).queryByText(/Over by/)).toBeNull();
  });

  // --- One celebration at a time ------------------------------------------

  describe("celebration queue", () => {
    /** How long each celebration holds the hero before the next one takes its place. */
    const HOLD_MS = 1500;
    const seen = (event: string) => localStorage.getItem(celebrationKey(ACCOUNT, event)) === "1";
    const coins = () => document.querySelectorAll('[data-testid="coin"]').length;
    const advance = async () => {
      await act(() => vi.advanceTimersByTimeAsync(HOLD_MS));
    };

    /** Mounts and lets the data land without moving the clock past any hold. */
    const load = async () => {
      mount();
      for (let i = 0; i < 5; i++) await act(() => vi.advanceTimersByTimeAsync(0));
      expect(hero()).not.toBeNull();
    };

    // Time moves only when a test advances it, so a slow runner cannot end a hold early. That is
    // also why these tests load with `load()`: findBy waits on timers that are frozen here.
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    });

    it("plays one at a time from the hero, the month first, then each completed goal", async () => {
      budgets(BUDGET, { ...PREV_BUDGET, items: [item()] });
      goalStrip.completed = ["goal-1", "goal-2"];
      await load();

      // The month's cheer is on; the goals wait their turn, unmarked.
      expect(coins()).toBe(1);
      expect(hero().querySelector('[data-testid="coin"]')).not.toBeNull();
      expect([seen(`month-${prevMonth}`), seen("goal-1"), seen("goal-2")]).toEqual([true, false, false]);

      await advance();
      expect(coins()).toBe(1);
      expect(hero().querySelector('[data-testid="coin"]')).not.toBeNull();
      expect([seen("goal-1"), seen("goal-2")]).toEqual([true, false]);

      await advance();
      expect(coins()).toBe(1);
      expect(seen("goal-2")).toBe(true);

      // The queue is spent: Piso stays in the month's cheer, with no coin left to drop.
      await advance();
      expect(coins()).toBe(0);
      expect(pisoStates()).toEqual(["cheer"]);
    });

    // Another tab can mark a queued goal while it waits; it is skipped, not held as a blank slot.
    it("skips a queued event that was marked seen elsewhere while it waited", async () => {
      budgets(BUDGET, { ...PREV_BUDGET, items: [item()] });
      goalStrip.completed = ["goal-1", "goal-2"];
      await load();
      localStorage.setItem(celebrationKey(ACCOUNT, "goal-1"), "1");

      await advance();
      // goal-2 takes the hero straight after the month; goal-1 does not hold it.
      expect(seen("goal-2")).toBe(true);
      expect(coins()).toBe(1);
    });

    // A flag that cannot be written stops Celebrate playing; the hero still shows Piso's mood.
    it("keeps Piso in the hero when the head's celebration declines to play", async () => {
      budgets(BUDGET, { ...PREV_BUDGET, items: [item()] });
      const write = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
        throw new Error("quota");
      });
      try {
        await load();
        expect(coins()).toBe(0);
        expect(pisoStates()).toEqual(["cheer"]);
      } finally {
        write.mockRestore();
      }
    });

    it("never replays a celebration whose key has already been seen", async () => {
      localStorage.setItem(celebrationKey(ACCOUNT, `month-${prevMonth}`), "1");
      localStorage.setItem(celebrationKey(ACCOUNT, "goal-1"), "1");
      budgets(BUDGET, { ...PREV_BUDGET, items: [item()] });
      goalStrip.completed = ["goal-1", "goal-2"];
      await load();

      // goal-2 is the only one left, and it plays at once.
      expect(seen("goal-2")).toBe(true);
      expect(coins()).toBe(1);

      await advance();
      expect(coins()).toBe(0);
      // Back to the mood the data picks, since this visit had no month to cheer.
      expect(pisoStates()).toEqual(["resting"]);
    });
  });

  // With no account there is no flag to scope to, so the hero keeps its resting Piso rather than
  // mounting a Celebrate that would render nothing.
  it("does not celebrate, and keeps Piso, when nobody is signed in", async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_user");
    budgets(BUDGET, { ...PREV_BUDGET, items: [item()] });
    await setup();

    expect(pisoStates()).toEqual(["resting"]);
    expect(document.querySelector('[data-testid="coin"]')).toBeNull();
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!);
    expect(keys.filter((k) => k.startsWith("ga.celebrate."))).toEqual([]);
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
