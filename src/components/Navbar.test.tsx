import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { BudgetSummaryResponse } from "../api/budgets";
import type { ExpenseRequest } from "../api/expenses";
import Navbar from "./Navbar";

const api = vi.hoisted(() => ({
  getBudgetSummary: vi.fn(),
  getExpensesPage: vi.fn(),
  createExpense: vi.fn(),
}));

const auth = vi.hoisted(() => ({ isAdmin: false, logout: vi.fn() }));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { name: "Demo User", nickname: "Demo", avatar: null, avatarColor: null },
    isAdmin: auth.isAdmin,
    logout: auth.logout,
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
  auth.isAdmin = false;
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

  it("renders the form outside the nav, whose backdrop blur would trap a fixed overlay", () => {
    const { container } = renderNavbar();
    fireEvent.click(screen.getByRole("button", { name: /log expense/i }));
    const dialog = screen.getByRole("dialog", { name: "Expense form" });
    expect(container.querySelector("nav")?.contains(dialog)).toBe(false);
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
    // jsdom does not reflect the `contentEditable` property, so set the attribute a browser would.
    editable.setAttribute("contenteditable", "true");
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

  it.each([
    // ui/Modal's overlay, which every other form in the app opens in (it carries no dialog role).
    ["another page's modal", () => {
      const overlay = document.createElement("div");
      overlay.className = "fixed inset-0 z-[80]";
      return overlay;
    }],
    // The first-run tour's tooltip.
    ["the tour", () => {
      const tooltip = document.createElement("div");
      tooltip.setAttribute("aria-modal", "true");
      return tooltip;
    }],
  ])("ignores n while %s is open", (_label, makeLayer) => {
    renderNavbar();
    const layer = makeLayer();
    document.body.appendChild(layer);
    fireEvent.keyDown(document.body, { key: "n" });
    layer.remove();
    expect(screen.queryByRole("dialog", { name: "Expense form" })).toBeNull();
  });

  it("ignores n typed as part of an IME composition", () => {
    renderNavbar();
    fireEvent.keyDown(document.body, { key: "n", isComposing: true });
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

  it("refetches the mood on navigation, so a budget edited on its page shows on leaving it", async () => {
    const { container } = renderNavbar();
    await waitFor(() => expect(moodMark(container)).toHaveAttribute("data-piso-state", "resting"));

    api.getBudgetSummary.mockResolvedValue(summary(["WARNING"]));
    fireEvent.click(screen.getByRole("link", { name: "Goals" }));

    await waitFor(() => expect(moodMark(container)).toHaveAttribute("data-piso-state", "worried"));
  });

  it.each([
    ["2026-09-30T16:30:00Z", "2026-10"], // 00:30 on 1 Oct in Manila, still September in UTC
    ["2026-12-31T16:30:00Z", "2027-01"], // and across the year
    ["2026-10-31T15:59:00Z", "2026-10"], // 23:59 on 31 Oct in Manila
  ])("keys the budget summary by the Manila month at %s", async (now, month) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(now));
    renderNavbar();
    await waitFor(() => expect(api.getBudgetSummary).toHaveBeenCalledWith(month));
  });

  it("keeps the newest mood when an older refetch lands after it", async () => {
    const { container } = renderNavbar();
    await waitFor(() => expect(moodMark(container)).toHaveAttribute("data-piso-state", "resting"));

    let resolveOlder!: (s: BudgetSummaryResponse) => void;
    let resolveNewer!: (s: BudgetSummaryResponse) => void;
    api.getBudgetSummary
      .mockReturnValueOnce(new Promise((r) => (resolveOlder = r)))
      .mockReturnValueOnce(new Promise((r) => (resolveNewer = r)));
    act(() => {
      window.dispatchEvent(new CustomEvent("gastosai:expense-changed"));
      window.dispatchEvent(new CustomEvent("gastosai:expense-changed"));
    });

    await act(async () => resolveNewer(summary(["WARNING"])));
    await act(async () => resolveOlder(summary(["OVER_BUDGET"])));
    expect(moodMark(container)).toHaveAttribute("data-piso-state", "worried");
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
    // Flush the passive effect that arms the reset timer before moving the clock; advancing first
    // races it under load and leaves the reset to real time, past waitFor's timeout. The clock
    // also drifts with real time here, so the lower bound is not pinned to the millisecond.
    await act(async () => {});

    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(moodMark(container)).toHaveAttribute("data-piso-state", "resting");
  });
});

describe("Navbar — overflow menu (TEN-459)", () => {
  function menuLinks() {
    return [...document.querySelectorAll("#nav-overflow-menu a")].map((a) => a.textContent);
  }

  it("holds every page link, so a phone without the inline links can reach them", () => {
    renderNavbar();
    const button = screen.getByRole("button", { name: "Menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    // A non-Premium user also gets Upgrade, as in the inline bar.
    expect(menuLinks()).toEqual(["Dashboard", "Expenses", "Categories", "Budget", "Recurring", "Goals", "Upgrade"]);
  });

  it("adds the admin pages for an admin", () => {
    auth.isAdmin = true;
    renderNavbar();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(menuLinks()).toEqual([
      "Dashboard", "Expenses", "Categories", "Budget", "Recurring", "Goals", "Messages", "Chat Audit", "Observability",
    ]);
  });

  it("carries the theme toggle, which the phone bar drops", () => {
    renderNavbar();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    const menu = document.getElementById("nav-overflow-menu")!;
    expect(menu.querySelector("[aria-label='Switch to dark mode']")).not.toBeNull();
  });

  it("closes on Escape, returning focus to its button, and after following a link", () => {
    renderNavbar();
    const button = screen.getByRole("button", { name: "Menu" });
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: "Escape" });
    expect(document.getElementById("nav-overflow-menu")).toBeNull();
    expect(button).toHaveFocus();

    fireEvent.click(button);
    fireEvent.click(within(document.getElementById("nav-overflow-menu")!).getByRole("link", { name: "Goals" }));
    expect(document.getElementById("nav-overflow-menu")).toBeNull();
  });
});

describe("Navbar — admin menu (TEN-494)", () => {
  it("shows regular users no Admin button and no admin links", () => {
    renderNavbar();
    expect(screen.queryByRole("button", { name: "Admin" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Chat Audit" })).toBeNull();
  });

  it("groups the three admin pages behind one Admin button", () => {
    auth.isAdmin = true;
    renderNavbar();
    const button = screen.getByRole("button", { name: "Admin" });
    expect(screen.queryByRole("link", { name: "Messages" })).toBeNull();
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Messages" })).toHaveAttribute("href", "/admin/submissions");
    expect(screen.getByRole("link", { name: "Chat Audit" })).toHaveAttribute("href", "/admin/chat-audit");
    expect(screen.getByRole("link", { name: "Observability" })).toHaveAttribute("href", "/admin/observability");
  });

  it("closes on Escape and after following a link", () => {
    auth.isAdmin = true;
    renderNavbar();
    const button = screen.getByRole("button", { name: "Admin" });
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: "Escape" });
    expect(screen.queryByRole("link", { name: "Messages" })).toBeNull();

    fireEvent.click(button);
    fireEvent.click(screen.getByRole("link", { name: "Observability" }));
    expect(screen.queryByRole("link", { name: "Messages" })).toBeNull();
  });
});

describe("Navbar — sign out (TEN-507)", () => {
  // Logged out, `/` is the public landing page, so clearing the session alone would leave a
  // dashboard user on `/` looking at the landing page instead of the sign-in form.
  it("clears the session and lands on /login, even from the dashboard at /", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Navbar isDark={false} onToggleDark={vi.fn()} />} />
          <Route path="/login" element={<p>login page</p>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Sign out" })[0]);
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(screen.getByText("login page")).toBeTruthy();
  });
});
