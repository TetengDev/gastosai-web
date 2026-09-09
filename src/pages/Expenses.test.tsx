import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Expenses from "./Expenses";
import { exportExpensesPdf, getExpenses, getProjects } from "../api/expenses";
import { useEntitlements, type UseEntitlements } from "../hooks/useEntitlements";
import { useExpenses } from "../hooks/useExpenses";
import type { Expense } from "../api/types";
import type { FeatureKey } from "../api/entitlements";

vi.mock("../api/expenses", () => ({
  deleteExpense: vi.fn(),
  downloadImportTemplate: vi.fn(),
  exportExpenses: vi.fn(),
  exportExpensesPdf: vi.fn(),
  getExpenses: vi.fn(),
  getProjects: vi.fn(),
  importExpensesCsv: vi.fn(),
}));
vi.mock("../hooks/useExpenses", () => ({ useExpenses: vi.fn() }));
vi.mock("../hooks/useFeatures", () => ({ useFeatures: vi.fn(() => ({ csvImport: false, chatAttachments: false })) }));
vi.mock("../hooks/useEntitlements", () => ({ useEntitlements: vi.fn() }));

const mockExportPdf = vi.mocked(exportExpensesPdf);
const mockGetProjects = vi.mocked(getProjects);
const mockUseExpenses = vi.mocked(useExpenses);
const mockUseEntitlements = vi.mocked(useEntitlements);

const expense: Expense = {
  id: 1,
  amount: 15075,
  currency: "PHP",
  exchangeRate: 1,
  amountInBaseCurrency: 15075,
  category: "Food",
  date: "2026-01-15T12:00:00+08:00",
  description: "Lunch",
  expenseType: "PERSONAL",
  reimbursable: false,
};

const entitledTo = (features: FeatureKey[]): UseEntitlements => ({
  entitlements: { plan: "PREMIUM", status: "ACTIVE", features, admin: false },
  has: (feature) => features.includes(feature),
  loading: false,
});

/**
 * The PDF report is a Premium capability served from a different path than the CSV export, and
 * a failure to render one is invisible unless the page says so. These cover the three things
 * TEN-315 asks for: the range and tag that reach the API, the entitlement gate, and the message.
 */
describe("Expenses PDF export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseExpenses.mockReturnValue({
      expenses: [expense],
      loading: false,
      loadingMore: false,
      error: null,
      total: 1,
      hasMore: false,
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      removeAll: vi.fn(),
      refresh: vi.fn(),
      loadMore: vi.fn(),
    } as unknown as ReturnType<typeof useExpenses>);
    mockUseEntitlements.mockReturnValue(entitledTo(["EXPORT_PDF"]));
    mockGetProjects.mockResolvedValue([]);
    mockExportPdf.mockResolvedValue(undefined);
    vi.mocked(getExpenses).mockResolvedValue([]);
  });

  const pdfButton = () => screen.getByRole("button", { name: /Export PDF/ });

  it("downloads the current date range", async () => {
    render(<Expenses />);

    const [fromInput, toInput] = document.querySelectorAll<HTMLInputElement>('input[type="date"]');
    fireEvent.change(fromInput, { target: { value: "2026-01-01" } });
    fireEvent.change(toInput, { target: { value: "2026-01-31" } });
    fireEvent.click(pdfButton());

    await waitFor(() => expect(mockExportPdf).toHaveBeenCalledTimes(1));
    expect(mockExportPdf).toHaveBeenCalledWith({
      from: "2026-01-01",
      to: "2026-01-31",
      projectId: undefined,
    });
  });

  it("downloads the selected tag when one is applied", async () => {
    mockGetProjects.mockResolvedValue([{ id: 9, name: "Acme Corp" }]);
    render(<Expenses />);

    const tag = await screen.findByLabelText("Tag");
    fireEvent.change(tag, { target: { value: "9" } });
    fireEvent.click(pdfButton());

    await waitFor(() => expect(mockExportPdf).toHaveBeenCalledTimes(1));
    expect(mockExportPdf).toHaveBeenCalledWith({ from: undefined, to: undefined, projectId: 9 });
  });

  it("hides the control when the plan lacks EXPORT_PDF", async () => {
    mockUseEntitlements.mockReturnValue(entitledTo(["EXPORT_CSV"]));

    render(<Expenses />);

    expect(screen.queryByRole("button", { name: /Export PDF/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Export CSV/ })).toBeTruthy();
    expect(mockGetProjects).not.toHaveBeenCalled();
  });

  it("surfaces a message when the download fails", async () => {
    mockExportPdf.mockRejectedValue(new Error("boom"));
    render(<Expenses />);

    fireEvent.click(pdfButton());

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/could not be generated/i);
  });
});
