import { act, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard, { abbrevCentavos, dailyAverageCentavos } from "./Dashboard";
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
import { formatCentavos, formatDate } from "../lib/formatters";

vi.mock("../api/budgets", () => ({ getBudgetSummary: vi.fn() }));

vi.mock("../api/expenses", () => ({
  getCategoryReport: vi.fn(),
  getExpensesPage: vi.fn(),
  getMonthlyComparison: vi.fn(),
  getMonthlyReport: vi.fn(),
}));

// The six child cards each fetch for themselves and carry their own tests. Stubbing them keeps
// every assertion below about markup Dashboard.tsx actually owns — which is what makes the
// "no hex" and "no Piso on a data surface" checks mean something.
vi.mock("../components/AiInsightsCard", () => ({ default: () => <div>AiInsightsCard</div> }));
vi.mock("../components/BudgetOverviewCard", () => ({ default: () => <div>BudgetOverviewCard</div> }));
vi.mock("../components/DailyTrendCard", () => ({ default: () => <div>DailyTrendCard</div> }));
vi.mock("../components/GoalProgressCard", () => ({ default: () => <div>GoalProgressCard</div> }));
vi.mock("../components/TopExpensesCard", () => ({ default: () => <div>TopExpensesCard</div> }));
vi.mock("../components/UpcomingBillsCard", () => ({ default: () => <div>UpcomingBillsCard</div> }));
vi.mock("../components/FeatureGate", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
// Real CategoryChip tints its icon from a hex palette, which would show up in the markup scan
// as colour Dashboard did not choose. The stub keeps the name, which is what Dashboard passes.
vi.mock("../components/CategoryChip", () => ({
  default: ({ name }: { name: string }) => <span>{name}</span>,
}));

const mockGetBudgetSummary = vi.mocked(getBudgetSummary);
const mockGetCategoryReport = vi.mocked(getCategoryReport);
const mockGetExpensesPage = vi.mocked(getExpensesPage);
const mockGetMonthlyComparison = vi.mocked(getMonthlyComparison);
const mockGetMonthlyReport = vi.mocked(getMonthlyReport);

// --- The same calendar arithmetic the page does, so the expectations move with the clock ----

const currentMonth = new Date().toISOString().slice(0, 7);
const [cy, cm] = currentMonth.split("-").map(Number);
const daysInMonth = new Date(cy, cm, 0).getDate();
const today = Math.min(new Date().getDate(), daysInMonth);
const daysLeft = Math.max(daysInMonth - today, 0);
const monthLabel = new Date(cy, cm - 1, 1).toLocaleString("default", {
  month: "short",
  year: "numeric",
});
const prevLabel = new Date(cy, cm - 2, 1).toLocaleString("default", {
  month: "short",
  year: "numeric",
});

// --- Fixtures ------------------------------------------------------------------------------

const CATEGORIES: CategoryReport[] = [
  { category: "Groceries", total: 812_345 },
  { category: "Transport", total: 245_000 },
  { category: "Utilities", total: 99_900 },
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
  size: 15,
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

const text = (el: Element) => el.textContent ?? "";

/** A page section by its `data-section` handle, so a category name and an expense's category
 *  chip — which carry the same string — can be asserted apart from each other. */
const section = (name: string) => document.querySelector(`[data-section="${name}"]`) as HTMLElement;

/** A KPI tile by its label. The tiles carry no heading or role, so `data-kpi` is the handle. */
const tile = (label: string) => document.querySelector(`[data-kpi="${label}"]`)!;

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

describe("dailyAverageCentavos", () => {
  it("reaches formatCentavos as a whole centavo when the quotient is not integral", () => {
    // 100,000 centavos over 3 days is 33,333.33... — formatCentavos renders a non-integer as
    // "0.00", so an unrounded average would show a plausible zero rather than failing.
    const avg = dailyAverageCentavos(100_000, 3);

    expect(Number.isInteger(avg)).toBe(true);
    expect(avg).toBe(33_333);
    expect(formatCentavos(avg)).toBe("₱333.33");
  });

  it("rounds a half centavo up rather than truncating", () => {
    expect(dailyAverageCentavos(101, 2)).toBe(51);
  });

  it("divides evenly when the total divides evenly", () => {
    expect(dailyAverageCentavos(90_000, 9)).toBe(10_000);
  });

  it("is zero before any day has elapsed", () => {
    expect(dailyAverageCentavos(100_000, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Render tests
//
// The restructure in TEN-433 moves every figure on this page. Nothing guarded that before, so
// each expectation below is computed from the fixture the component is handed — the formatted
// amount, the derived day counts, the month labels — rather than copied out of the JSX. A test
// that restates today's markup would pass through a dropped figure; one that re-derives it from
// the data cannot.
// ---------------------------------------------------------------------------

describe("Dashboard render", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCategoryReport.mockResolvedValue(CATEGORIES);
    mockGetExpensesPage.mockResolvedValue(page(EXPENSES));
    mockGetMonthlyReport.mockResolvedValue(MONTHLY);
    mockGetMonthlyComparison.mockResolvedValue(MOM);
    mockGetBudgetSummary.mockResolvedValue(BUDGET);
  });

  // The over-budget notice links to /budget, so the page needs a router context.
  const mount = () =>
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

  const setup = async () => {
    const view = mount();
    await screen.findByText(new RegExp(`Total Spend · ${monthLabel}`));
    return view;
  };

  it("renders the three KPI labels the happy suite selects on", async () => {
    await setup();

    expect(screen.getByText(`Total Spend · ${monthLabel}`)).toBeInTheDocument();
    expect(screen.getByText("Remaining Budget")).toBeInTheDocument();
    expect(screen.getByText("Daily Average")).toBeInTheDocument();
  });

  it("renders the month's total as the hero figure, to the centavo", async () => {
    const { container } = await setup();
    const hero = container.querySelector("div.bg-hero")!;

    // The figure is split across two spans so the cents can render smaller; the tile's own
    // text is where the whole amount has to be readable.
    expect(text(hero)).toContain(formatCentavos(MOM.currentTotal));
  });

  it("renders remaining budget, the daily allowance and the days left", async () => {
    await setup();

    expect(text(tile("Remaining Budget"))).toContain(formatCentavos(BUDGET.safeToSpend));
    expect(text(tile("Remaining Budget"))).toContain(formatCentavos(BUDGET.dailyAllowance));
    expect(text(tile("Remaining Budget"))).toContain(
      `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`
    );
  });

  it("renders the daily average as the month total over the elapsed days", async () => {
    await setup();

    const expected = formatCentavos(dailyAverageCentavos(MOM.currentTotal, today));
    expect(text(tile("Daily Average"))).toContain(expected);
    expect(text(tile("Daily Average"))).toContain(`Day ${today} of ${daysInMonth}`);
  });

  it("renders the month-on-month change against the previous month's label", async () => {
    const { container } = await setup();

    const hero = text(container.querySelector("div.bg-hero")!);
    expect(hero).toContain(`${Math.abs(MOM.changePercent!).toFixed(1)}%`);
    expect(hero).toContain(prevLabel);
    expect(hero).toContain("Spending more");
  });

  it.each([
    [-8.4, "Spending less"],
    [0, "No change vs last month"],
    [null, "No prior data"],
  ])("captions a change of %s as %s", async (changePercent, caption) => {
    mockGetMonthlyComparison.mockResolvedValue({ ...MOM, changePercent });
    await setup();

    expect(screen.getByText(caption)).toBeInTheDocument();
  });

  it("renders every category with its own total, and the category count", async () => {
    await setup();

    expect(screen.getByText("Spending by Category")).toBeInTheDocument();
    expect(
      screen.getByText(`${CATEGORIES.length} ${CATEGORIES.length === 1 ? "category" : "categories"}`)
    ).toBeInTheDocument();

    const categories = within(section("categories"));
    for (const c of CATEGORIES) {
      expect(categories.getByText(c.category)).toBeInTheDocument();
      expect(categories.getByText(formatCentavos(c.total))).toBeInTheDocument();
    }
  });

  it("renders every recent expense with its amount, category and date", async () => {
    await setup();

    expect(screen.getByText("Recent Expenses")).toBeInTheDocument();

    const recent = within(section("recent"));
    for (const e of EXPENSES) {
      expect(recent.getByText(e.description!)).toBeInTheDocument();
      expect(recent.getByText(formatCentavos(e.amount))).toBeInTheDocument();
      expect(recent.getByText(formatDate(e.date))).toBeInTheDocument();
      expect(recent.getByText(e.category!)).toBeInTheDocument();
    }
  });

  it("caps the recent list at ten rows however many came back", async () => {
    const many = Array.from({ length: 15 }, (_, i) => expense({ id: 100 + i, description: `Row ${i}` }));
    mockGetExpensesPage.mockResolvedValue(page(many));
    await setup();

    const recent = within(section("recent"));
    expect(recent.getByText("Row 9")).toBeInTheDocument();
    expect(recent.queryByText("Row 10")).not.toBeInTheDocument();
  });

  it("renders the Monthly Trend heading and its window caption", async () => {
    await setup();

    expect(screen.getByText("Monthly Trend")).toBeInTheDocument();
    expect(screen.getByText("Last 6 months")).toBeInTheDocument();
  });

  // --- Empty, null and error paths ----------------------------------------

  it("says what an absent budget means instead of printing a bare dash", async () => {
    mockGetBudgetSummary.mockResolvedValue({ ...BUDGET, items: [] });
    await setup();

    const remaining = text(tile("Remaining Budget"));
    expect(remaining).toContain("No budget set");
    // "—" alone tells a reader nothing; the regression this guards is it coming back.
    expect(remaining).not.toMatch(/—/);
  });

  it("survives the budget endpoint failing outright", async () => {
    mockGetBudgetSummary.mockRejectedValue(new Error("no budget service"));
    await setup();

    expect(text(tile("Remaining Budget"))).toContain("No budget set");
  });

  it("illustrates the empty expense list with Piso rather than an emoji", async () => {
    mockGetExpensesPage.mockResolvedValue(page([]));
    const { container } = await setup();

    expect(screen.getByText("No expenses yet")).toBeInTheDocument();
    expect(screen.getByText("Add an expense to see it here")).toBeInTheDocument();
    expect(container.querySelector("[data-piso-state]")).toBeTruthy();
    expect(text(container)).not.toContain("💸");
  });

  it("captions both charts when they have no data", async () => {
    mockGetCategoryReport.mockResolvedValue([]);
    mockGetMonthlyReport.mockResolvedValue([]);
    await setup();

    expect(screen.getByText("No category data yet.")).toBeInTheDocument();
    expect(screen.getByText("No monthly data yet.")).toBeInTheDocument();
  });

  it("offers a retry when the page fails to load, with no raw hex in the markup", async () => {
    mockGetCategoryReport.mockRejectedValue(new Error("down"));
    const { container } = mount();

    expect(await screen.findByText("Failed to load dashboard data.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    // The error red is `--ga-danger` now, so even this path carries no literal.
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{6}/);
  });

  it("re-fetches when an expense changes elsewhere in the app", async () => {
    await setup();
    expect(mockGetCategoryReport).toHaveBeenCalledTimes(1);

    await act(async () => {
      window.dispatchEvent(new Event("gastosai:expense-changed"));
    });

    expect(mockGetCategoryReport).toHaveBeenCalledTimes(2);
  });

  // --- Over budget --------------------------------------------------------

  it("raises an over-budget notice, in words, when a budget is blown", async () => {
    mockGetBudgetSummary.mockResolvedValue({
      ...BUDGET,
      safeToSpend: -50_000,
      items: [item({ categoryName: "Food", status: "OVER_BUDGET", remaining: -50_000 })],
    });
    const { container } = await setup();

    const notice = container.querySelector('[data-piso-state="overBudget"]');
    expect(notice).toBeTruthy();
    // Piso is never the only signal: the text has to say it too.
    expect(screen.getByText(/over budget/i)).toBeInTheDocument();
  });

  it("raises no over-budget notice while every budget is on track", async () => {
    const { container } = await setup();

    expect(container.querySelector('[data-piso-state="overBudget"]')).toBeNull();
  });

  // --- Structure the restructure must not undo ----------------------------

  it("keeps no hardcoded hex colour anywhere in the loaded page", async () => {
    const { container } = await setup();

    // Unlike the error card, nothing on the loaded page needs the untokenised red.
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{6}/);
  });

  it("does not place Piso on a data surface", async () => {
    const { container } = await setup();

    // Four surfaces are allowed the character and none of them is a figure, a chart or a list
    // row. With expenses present, the dashboard's only Piso would be the over-budget notice —
    // and this fixture is on track, so there should be none at all.
    expect(container.querySelectorAll("[data-piso-state]")).toHaveLength(0);
  });

  it("renders a skeleton, not a figure, before the data lands", () => {
    mockGetCategoryReport.mockReturnValue(new Promise(() => {}));
    const { container } = mount();

    expect(container.querySelector(".animate-pulse")).toBeTruthy();
    expect(screen.queryByText(`Total Spend · ${monthLabel}`)).not.toBeInTheDocument();
  });
});
