import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Expenses from "./Expenses";
import {
  exportExpenses,
  exportExpensesPdf,
  getDailyReport,
  getExpenses,
  getProjects,
  type DailyReport,
} from "../api/expenses";
import { useEntitlements, type UseEntitlements } from "../hooks/useEntitlements";
import { useExpenses } from "../hooks/useExpenses";
import { useFeatures } from "../hooks/useFeatures";
import { useAuth } from "../context/AuthContext";
import type { Expense, ExpenseRequest } from "../api/expenses";
import type { FeatureKey } from "../api/entitlements";

vi.mock("../api/expenses", () => ({
  deleteExpense: vi.fn(),
  downloadImportTemplate: vi.fn(),
  exportExpenses: vi.fn(),
  exportExpensesPdf: vi.fn(),
  getDailyReport: vi.fn(),
  getExpenses: vi.fn(),
  getProjects: vi.fn(),
  importExpensesCsv: vi.fn(),
}));
vi.mock("../hooks/useExpenses", () => ({ useExpenses: vi.fn() }));
vi.mock("../hooks/useFeatures", () => ({ useFeatures: vi.fn() }));
vi.mock("../hooks/useEntitlements", () => ({ useEntitlements: vi.fn() }));
// Celebrate's seen flag is per account; it reads the account from here.
vi.mock("../context/AuthContext", () => ({ useAuth: vi.fn() }));

// The modal has its own tests. Here it is only the thing that calls the page's `onSave`, and a
// rejected save is swallowed the way the real modal shows it inline.
const REQ: ExpenseRequest = {
  amount: 25_000,
  category: "Food",
  date: "2026-11-18T09:00",
  description: "Lunch",
  expenseType: "PERSONAL",
  reimbursable: false,
  currency: "PHP",
  exchangeRate: 1,
};
vi.mock("../components/ExpenseModal", () => ({
  default: ({ onSave }: { onSave: (r: ExpenseRequest) => Promise<void> }) => (
    <button type="button" onClick={() => void onSave(REQ).catch(() => {})}>
      Stub save
    </button>
  ),
}));

const mockExportCsv = vi.mocked(exportExpenses);
const mockExportPdf = vi.mocked(exportExpensesPdf);
const mockGetExpenses = vi.mocked(getExpenses);
const mockGetDailyReport = vi.mocked(getDailyReport);
const mockGetProjects = vi.mocked(getProjects);
const mockUseExpenses = vi.mocked(useExpenses);
const mockUseEntitlements = vi.mocked(useEntitlements);
const mockUseFeatures = vi.mocked(useFeatures);

const expense = (over: Partial<Expense>): Expense => ({
  id: 1,
  amount: 15075,
  currency: "PHP",
  exchangeRate: 1,
  amountInBaseCurrency: 15075,
  category: "Food",
  date: "2026-11-18T12:00:00+08:00",
  description: "Lunch",
  expenseType: "PERSONAL",
  reimbursable: false,
  source: "MANUAL",
  ...over,
});

// Two days in November. The report's totals are deliberately not what the rows add up to, so a
// header that summed its rows would show the wrong figure.
const NOVEMBER = [
  expense({ id: 1, description: "Lunch", category: "Food", date: "2026-11-18T12:00:00+08:00" }),
  expense({ id: 2, description: "Jeepney", category: "Transport", amount: 1300, amountInBaseCurrency: 1300, date: "2026-11-18T08:00:00+08:00" }),
  expense({ id: 3, description: "Electric bill", category: "Bills", amount: 250000, amountInBaseCurrency: 250000, date: "2026-11-17T19:00:00+08:00" }),
];
const NOVEMBER_REPORT: DailyReport[] = [
  { date: "2026-11-17", total: 12_345 },
  { date: "2026-11-18", total: 99_999 },
];

const entitledTo = (features: FeatureKey[]): UseEntitlements => ({
  entitlements: { plan: "PREMIUM", status: "ACTIVE", features, admin: false },
  has: (feature) => features.includes(feature),
  loading: false,
});

const hook = (over: Partial<ReturnType<typeof useExpenses>> = {}) => {
  const value = {
    expenses: [],
    loading: false,
    loadingMore: false,
    error: null,
    total: 3,
    hasMore: false,
    add: vi.fn().mockResolvedValue(expense({ id: 99, date: "2026-11-18T09:00:00+08:00" })),
    update: vi.fn().mockResolvedValue(expense({})),
    remove: vi.fn(),
    removeAll: vi.fn(),
    refresh: vi.fn(),
    loadMore: vi.fn(),
    ...over,
  } as unknown as ReturnType<typeof useExpenses>;
  mockUseExpenses.mockReturnValue(value);
  return value;
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  // 12:00 on 18 Nov 2026 in Manila. Only `Date` is faked, so promises and waitFor run normally.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-18T04:00:00Z"));
  hook();
  mockUseEntitlements.mockReturnValue(entitledTo(["EXPORT_PDF"]));
  mockUseFeatures.mockReturnValue({ csvImport: false, chatAttachments: false } as unknown as ReturnType<typeof useFeatures>);
  vi.mocked(useAuth).mockReturnValue({ user: { email: "a@example.com" } } as unknown as ReturnType<typeof useAuth>);
  mockGetProjects.mockResolvedValue([]);
  mockExportPdf.mockResolvedValue(undefined);
  mockExportCsv.mockResolvedValue(undefined);
  mockGetExpenses.mockResolvedValue(NOVEMBER);
  mockGetDailyReport.mockResolvedValue(NOVEMBER_REPORT);
});

afterEach(() => {
  vi.useRealTimers();
});

const loaded = async () => {
  render(<Expenses />);
  await screen.findByText("Electric bill");
};
const openMenu = () => fireEvent.click(screen.getByRole("button", { name: "More actions" }));
const dayGroups = () => [...document.querySelectorAll("tbody")];

describe("Expenses by day", () => {
  it("groups the month's rows under day headers, newest first, with the server's day totals", async () => {
    await loaded();

    const [first, second] = dayGroups();
    expect(dayGroups()).toHaveLength(2);
    const firstHeader = first.querySelector("tr")!;
    expect(firstHeader).toHaveTextContent("Nov 18");
    expect(firstHeader).toHaveTextContent("₱999.99");
    expect(within(first).getByText("Lunch")).toBeTruthy();
    expect(within(first).getByText("Jeepney")).toBeTruthy();
    const secondHeader = second.querySelector("tr")!;
    expect(secondHeader).toHaveTextContent("Nov 17");
    expect(secondHeader).toHaveTextContent("₱123.45");
    expect(within(second).getByText("Electric bill")).toBeTruthy();
    expect(mockGetExpenses).toHaveBeenCalledWith({ from: "2026-11-01", to: "2026-11-30" });
    expect(mockGetDailyReport).toHaveBeenCalledWith("2026-11");
  });

  it("renders each amount with Amount", async () => {
    await loaded();
    const row = screen.getByText("Electric bill").closest("tr")!;
    expect(within(row).getByText("₱2,500.00")).toHaveClass("tabular-nums");
  });

  it("filters by description and by category, and drops the day totals while it does", async () => {
    await loaded();
    const search = screen.getByRole("searchbox", { name: "Search expenses" });

    fireEvent.change(search, { target: { value: "lunch" } });
    expect(screen.queryByText("Jeepney")).toBeNull();
    expect(screen.getByText("Lunch")).toBeTruthy();
    expect(screen.queryByText("₱999.99")).toBeNull();

    fireEvent.change(search, { target: { value: "transport" } });
    expect(screen.getByText("Jeepney")).toBeTruthy();
    expect(screen.queryByText("Lunch")).toBeNull();
  });

  it("says so when nothing matches the search", async () => {
    await loaded();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search expenses" }), { target: { value: "zzz" } });
    expect(screen.getByText(/No expenses match/)).toBeTruthy();
  });

  it("shows no day total when the report fails, rather than adding the rows up", async () => {
    mockGetDailyReport.mockRejectedValue(new Error("offline"));
    await loaded();
    expect(screen.queryByText("₱999.99")).toBeNull();
    expect(dayGroups()).toHaveLength(2);
  });
});

describe("Expenses month stepper", () => {
  it("requests the previous month's expenses and daily report", async () => {
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));

    await waitFor(() => expect(mockGetExpenses).toHaveBeenCalledWith({ from: "2026-10-01", to: "2026-10-31" }));
    expect(mockGetDailyReport).toHaveBeenCalledWith("2026-10");
  });

  it("cannot step past the current month", async () => {
    await loaded();
    const next = screen.getByRole("button", { name: "Next month" });
    expect(next).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(next);
    expect(mockGetExpenses).toHaveBeenCalledTimes(1);
  });

  it("keeps the page when a month step fails, and says so inline", async () => {
    await loaded();
    mockGetExpenses.mockRejectedValueOnce(new Error("offline"));
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Could not load October 2026/);
    expect(screen.getByText("Electric bill")).toBeTruthy();
  });

  it("says when the month has no expenses, without Piso", async () => {
    mockGetExpenses.mockResolvedValue([]);
    mockGetDailyReport.mockResolvedValue([]);
    render(<Expenses />);
    expect(await screen.findByText(/Nothing logged in November 2026/)).toBeTruthy();
    expect(document.querySelector("svg[data-piso-state]")).toBeNull();
  });
});

describe("Expenses overflow menu", () => {
  it("keeps import, export and delete-all behind More actions", async () => {
    mockUseFeatures.mockReturnValue({ csvImport: true, chatAttachments: false } as unknown as ReturnType<typeof useFeatures>);
    await loaded();

    for (const name of [/Import CSV/, /Export CSV/, /Export PDF/, /Delete all/]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
    const toggle = screen.getByRole("button", { name: "More actions" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    openMenu();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    for (const name of [/Import CSV/, /Export CSV/, /Export PDF/, /Delete all/]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
  });

  it("closes on Escape and hands focus back to its button", async () => {
    await loaded();
    openMenu();
    screen.getByRole("button", { name: /Export CSV/ }).focus();

    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("button", { name: /Export CSV/ })).toBeNull();
    expect(screen.getByRole("button", { name: "More actions" })).toHaveFocus();
  });

  it("asks before deleting every expense in every month", async () => {
    await loaded();
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: /Delete all/ }));
    expect(await screen.findByText(/all 3 expenses, in every month/)).toBeTruthy();
  });
});

/**
 * The PDF report is a Premium capability served from a different path than the CSV export, and
 * a failure to render either one is invisible unless the page says so. These cover the three
 * things TEN-315 asks for — the range and tag that reach the API, the entitlement gate, and the
 * message — plus the CSV failure path, which used to fail silently (TEN-372). Both controls
 * write to the same alert, so the last failure is the one shown. The range defaults to the
 * stepper's month and keeps its own From/To fields (R21).
 */
describe("Expenses exports", () => {
  const pdfButton = () => screen.getByRole("button", { name: /Export PDF/ });
  const csvButton = () => screen.getByRole("button", { name: /Export CSV/ });

  it("downloads the selected month by default", async () => {
    await loaded();
    openMenu();
    fireEvent.click(pdfButton());

    await waitFor(() => expect(mockExportPdf).toHaveBeenCalledTimes(1));
    expect(mockExportPdf).toHaveBeenCalledWith({ from: "2026-11-01", to: "2026-11-30", projectId: undefined });
  });

  it("downloads a custom range from its own date fields", async () => {
    await loaded();
    openMenu();
    fireEvent.change(screen.getByLabelText("Export from"), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText("Export to"), { target: { value: "2026-03-31" } });
    fireEvent.click(csvButton());

    await waitFor(() => expect(mockExportCsv).toHaveBeenCalledWith({ from: "2026-01-01", to: "2026-03-31" }));
  });

  it("resets the range to the new month when the stepper moves", async () => {
    await loaded();
    openMenu();
    fireEvent.change(screen.getByLabelText("Export from"), { target: { value: "2026-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    if (!screen.queryByLabelText("Export from")) openMenu();

    expect(screen.getByLabelText("Export from")).toHaveValue("2026-10-01");
    expect(screen.getByLabelText("Export to")).toHaveValue("2026-10-31");
  });

  it("downloads the selected tag when one is applied", async () => {
    mockGetProjects.mockResolvedValue([{ id: 9, name: "Acme Corp" }]);
    await loaded();
    openMenu();

    const tag = await screen.findByLabelText("Tag");
    fireEvent.change(tag, { target: { value: "9" } });
    fireEvent.click(pdfButton());

    await waitFor(() => expect(mockExportPdf).toHaveBeenCalledTimes(1));
    expect(mockExportPdf).toHaveBeenCalledWith({ from: "2026-11-01", to: "2026-11-30", projectId: 9 });
  });

  it("hides the control when the plan lacks EXPORT_PDF", async () => {
    mockUseEntitlements.mockReturnValue(entitledTo(["EXPORT_CSV"]));
    await loaded();
    openMenu();

    expect(screen.queryByRole("button", { name: /Export PDF/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Export CSV/ })).toBeTruthy();
    expect(mockGetProjects).not.toHaveBeenCalled();
  });

  it("surfaces a message when the download fails", async () => {
    mockExportPdf.mockRejectedValue(new Error("boom"));
    await loaded();
    openMenu();

    fireEvent.click(pdfButton());

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/could not be generated/i);
  });

  it("surfaces a message when the CSV download fails", async () => {
    mockExportCsv.mockRejectedValue(new Error("boom"));
    await loaded();
    openMenu();

    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(csvButton());

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/CSV could not be generated/i);
  });

  it("clears an earlier failure when a later export succeeds", async () => {
    mockExportCsv.mockRejectedValueOnce(new Error("boom"));
    await loaded();
    openMenu();

    fireEvent.click(csvButton());
    await screen.findByRole("alert");

    fireEvent.click(csvButton());
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(mockExportCsv).toHaveBeenCalledTimes(2);
  });
});

describe("Expenses first run", () => {
  it("shows EmptyState with one action for an account with no expenses", async () => {
    hook({ total: 0 });
    mockGetExpenses.mockResolvedValue([]);
    mockGetDailyReport.mockResolvedValue([]);
    render(<Expenses />);

    expect(await screen.findByRole("button", { name: "Log your first expense" })).toBeTruthy();
    expect(document.querySelector('svg[data-piso-state="empty"]')).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Add Expense" })).toBeNull();
  });

  it("celebrates the first expense ever", async () => {
    hook({ total: 0 });
    mockGetExpenses.mockResolvedValue([]);
    mockGetDailyReport.mockResolvedValue([]);
    render(<Expenses />);

    fireEvent.click(await screen.findByRole("button", { name: "Log your first expense" }));
    fireEvent.click(screen.getByRole("button", { name: "Stub save" }));

    await waitFor(() => expect(document.querySelector('svg[data-piso-state="cheer"]')).not.toBeNull());
  });

  it("does not celebrate when expenses already exist", async () => {
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Add Expense" }));
    fireEvent.click(screen.getByRole("button", { name: "Stub save" }));

    await waitFor(() => expect(document.querySelector('svg[data-piso-state="saved"]')).not.toBeNull());
    expect(document.querySelector('svg[data-piso-state="cheer"]')).toBeNull();
  });
});

/** R26: the save's reward sits beside Add Expense in the pinned bar, for 1.2 s. */
describe("Expenses saved face", () => {
  const savedFaces = () => document.querySelectorAll('svg[data-piso-state="saved"]');

  it("shows Piso saved beside Add Expense for 1.2 s after a new expense", async () => {
    await loaded();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.click(screen.getByRole("button", { name: "Add Expense" }));
    fireEvent.click(screen.getByRole("button", { name: "Stub save" }));

    await waitFor(() => expect(savedFaces()).toHaveLength(1));
    expect(screen.getByRole("img", { name: "Expense saved" })).toBeTruthy();
    await act(async () => {});
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(savedFaces()).toHaveLength(0);
  });

  it("shows nothing when the save fails", async () => {
    const add = vi.fn().mockRejectedValue(new Error("boom"));
    hook({ add });
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Add Expense" }));
    fireEvent.click(screen.getByRole("button", { name: "Stub save" }));

    await waitFor(() => expect(add).toHaveBeenCalled());
    await act(async () => {});
    expect(savedFaces()).toHaveLength(0);
  });

  it("shows nothing for an edit", async () => {
    const value = hook();
    await loaded();
    const row = screen.getByText("Lunch").closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Stub save" }));

    await waitFor(() => expect(value.update).toHaveBeenCalled());
    await act(async () => {});
    expect(savedFaces()).toHaveLength(0);
  });

  it("moves to the month a new expense was filed in", async () => {
    hook({ add: vi.fn().mockResolvedValue(expense({ id: 99, date: "2026-10-03T09:00:00+08:00" })) });
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Add Expense" }));
    fireEvent.click(screen.getByRole("button", { name: "Stub save" }));

    await waitFor(() => expect(mockGetDailyReport).toHaveBeenCalledWith("2026-10"));
  });
});
