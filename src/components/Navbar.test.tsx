import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { BudgetSummaryResponse } from "../api/budgets";
import type { ExpenseRequest } from "../api/expenses";
import Navbar from "./Navbar";

const api = vi.hoisted(() => ({
  getBudgetSummary: vi.fn(),
  getExpensesPage: vi.fn(),
  createExpense: vi.fn(),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { name: "Demo User", nickname: "Demo", avatar: null, avatarColor: null },
    isAdmin: false,
    logout: vi.fn(),
  }),
}));
vi.mock("../hooks/useEntitlements", () => ({
  useEntitlements: () => ({ entitlements: null, has: () => true, loading: false }),
}));
vi.mock("../api/budgets", () => ({ getBudgetSummary: api.getBudgetSummary }));
vi.mock("../api/expenses", () => ({
  getExpensesPage: api.getExpensesPage,
  createExpense: api.createExpense,
}));
vi.mock("./AdminViewAsToggle", () => ({ default: () => null }));
vi.mock("./NotificationBell", () => ({ NotificationBell: () => null }));
vi.mock("./TipsPopover", () => ({ default: () => null }));

const NEW_EXPENSE = { amount: 25000, category: "Food" } as ExpenseRequest;

// ExpenseModal is W4's and has its own suite; here it only has to prove it was opened and can save.
vi.mock("./ExpenseModal", () => ({
  default: ({ onSave, onClose }: { onSave: (d: ExpenseRequest) => Promise<void>; onClose: () => void }) => (
    <div role="dialog" aria-label="Expense form">
      <button onClick={() => void onSave(NEW_EXPENSE)}>Save</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ),
}));

type Status = BudgetSummaryResponse["items"][number]["status"];

function summary(statuses: readonly Status[]): BudgetSummaryResponse {
  return {
    items: statuses.map((status, i) => ({ category: `Cat ${i}`, status })),
  } as unknown as BudgetSummaryResponse;
}

function page(totalElements: number) {
  return { content: [], totalElements, last: true };
}

function renderNavbar() {
  return render(
    <MemoryRouter>
      <input aria-label="Search" />
      <Navbar isDark={false} onToggleDark={vi.fn()} />
    </MemoryRouter>,
  );
}

function moodMark(container: HTMLElement) {
  return container.querySelector("[data-testid='nav-mood-mark'] [data-piso-state]");
}

beforeEach(() => {
  api.getBudgetSummary.mockResolvedValue(summary([]));
  api.getExpensesPage.mockResolvedValue(page(3));
  api.createExpense.mockResolvedValue({ id: 1 });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("Navbar", () => {
  it("anchors every tour step target", () => {
    const { container } = renderNavbar();
    for (const tour of [
      "nav-dashboard",
      "nav-expenses",
      "nav-categories",
      "nav-budget",
      "nav-recurring",
      "nav-goals",
      "nav-settings",
    ]) {
      expect(container.querySelector(`[data-tour='${tour}']`)).not.toBeNull();
    }
  });

  it("anchors Dashboard and Categories on their own nav links", () => {
    const { container } = renderNavbar();
    expect(container.querySelector("[data-tour='nav-dashboard']")?.textContent).toBe("Dashboard");
    expect(container.querySelector("[data-tour='nav-categories']")?.textContent).toBe("Categories");
  });
});

describe("Navbar — Log expense", () => {
  it("opens the expense form from the Log expense button", () => {
    renderNavbar();
    expect(screen.queryByRole("dialog", { name: "Expense form" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /log expense/i }));

    expect(screen.getByRole("dialog", { name: "Expense form" })).toBeInTheDocument();
  });

  it("advertises the n shortcut on the button", () => {
    renderNavbar();
    expect(screen.getByRole("button", { name: /log expense/i })).toHaveAttribute("aria-keyshortcuts", "n");
  });

  it("opens the expense form on the n key", () => {
    renderNavbar();
    fireEvent.keyDown(document.body, { key: "n" });
    expect(screen.getByRole("dialog", { name: "Expense form" })).toBeInTheDocument();
  });

  it("ignores n while focus is in a text field", () => {
    renderNavbar();
    const search = screen.getByRole("textbox", { name: "Search" });
    search.focus();
    fireEvent.keyDown(search, { key: "n" });
    expect(screen.queryByRole("dialog", { name: "Expense form" })).toBeNull();
  });

  it("ignores n inside a contenteditable region", () => {
    renderNavbar();
    const editable = document.createElement("div");
    editable.contentEditable = "true";
    document.body.appendChild(editable);
    fireEvent.keyDown(editable, { key: "n" });
    editable.remove();
    expect(screen.queryByRole("dialog", { name: "Expense form" })).toBeNull();
  });

  it("leaves modified n alone, so browser shortcuts still work", () => {
    renderNavbar();
    for (const mod of ["ctrlKey", "metaKey", "altKey"] as const) {
      fireEvent.keyDown(document.body, { key: "n", [mod]: true });
    }
    expect(screen.queryByRole("dialog", { name: "Expense form" })).toBeNull();
  });

  it("stops listening for n once unmounted", () => {
    const { unmount } = renderNavbar();
    unmount();
    fireEvent.keyDown(document.body, { key: "n" });
    expect(screen.queryByRole("dialog", { name: "Expense form" })).toBeNull();
  });

  it("closes the form on cancel", () => {
    renderNavbar();
    fireEvent.click(screen.getByRole("button", { name: /log expense/i }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "Expense form" })).toBeNull();
  });

  it("creates the expense, tells the app it changed, and closes", async () => {
    const changed = vi.fn();
    window.addEventListener("gastosai:expense-changed", changed);
    renderNavbar();

    fireEvent.click(screen.getByRole("button", { name: /log expense/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Expense form" })).toBeNull());
    expect(api.createExpense).toHaveBeenCalledWith(NEW_EXPENSE);
    expect(changed).toHaveBeenCalledTimes(1);
    window.removeEventListener("gastosai:expense-changed", changed);
  });
});

describe("Navbar — mood mark", () => {
  it.each<[string, readonly Status[], number]>([
    ["resting", [], 3],
    ["resting", ["ON_TRACK"], 3],
    ["worried", ["ON_TRACK", "WARNING"], 3],
    ["overBudget", ["WARNING", "OVER_BUDGET"], 3],
    ["empty", [], 0],
  ])("shows %s for bands %j with %i expenses", async (state, statuses, count) => {
    api.getBudgetSummary.mockResolvedValue(summary(statuses));
    api.getExpensesPage.mockResolvedValue(page(count));
    const { container } = renderNavbar();
    await waitFor(() => expect(moodMark(container)).toHaveAttribute("data-piso-state", state));
  });

  it("renders the 24px faceless mark", async () => {
    const { container } = renderNavbar();
    await waitFor(() => expect(moodMark(container)).toHaveAttribute("width", "24"));
  });

  it("refetches the mood when an expense changes elsewhere", async () => {
    const { container } = renderNavbar();
    await waitFor(() => expect(moodMark(container)).toHaveAttribute("data-piso-state", "resting"));

    api.getBudgetSummary.mockResolvedValue(summary(["OVER_BUDGET"]));
    act(() => {
      window.dispatchEvent(new CustomEvent("gastosai:expense-changed"));
    });

    await waitFor(() => expect(moodMark(container)).toHaveAttribute("data-piso-state", "overBudget"));
  });

  it("keeps a resting mark when the budget summary fails", async () => {
    api.getBudgetSummary.mockRejectedValue(new Error("offline"));
    const { container } = renderNavbar();
    await waitFor(() => expect(api.getExpensesPage).toHaveBeenCalled());
    expect(moodMark(container)).toHaveAttribute("data-piso-state", "resting");
  });

  it("shows saved for 1.2 s after logging, then returns to the mood", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { container } = renderNavbar();
    await waitFor(() => expect(moodMark(container)).toHaveAttribute("data-piso-state", "resting"));

    fireEvent.click(screen.getByRole("button", { name: /log expense/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(moodMark(container)).toHaveAttribute("data-piso-state", "saved"));

    act(() => {
      vi.advanceTimersByTime(1200);
    });
    await waitFor(() => expect(moodMark(container)).toHaveAttribute("data-piso-state", "resting"));
  });
});
