import { createElement, useEffect, useState } from "react";
import { LogOut, Moon, Plus, Sun, Zap } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getBudgetSummary } from "../api/budgets";
import { createExpense, getExpensesPage } from "../api/expenses";
import type { ExpenseRequest } from "../api/expenses";
import Piso from "../brand/Piso";
import { APP_TIME_ZONE, getAvatarGradient, getInitials } from "../lib/formatters";
import { avatarIconFor } from "../lib/avatarIcons";
import { pisoMoodFor, toBand, type BudgetBand } from "../lib/pisoMood";
import AdminViewAsToggle from "./AdminViewAsToggle";
import ExpenseModal from "./ExpenseModal";
import { Button } from "./ui";
import { NotificationBell } from "./NotificationBell";
import TipsPopover from "./TipsPopover";
import { useEntitlements } from "../hooks/useEntitlements";
import { BILLING_ENABLED } from "../config/billing";

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true, tour: "nav-dashboard" },
  { to: "/expenses", label: "Expenses", end: false, tour: "nav-expenses" },
  { to: "/categories", label: "Categories", end: false, tour: "nav-categories" },
  { to: "/budget", label: "Budget", end: false, tour: "nav-budget" },
  { to: "/recurring", label: "Recurring", end: false, tour: "nav-recurring" },
  { to: "/goals", label: "Goals", end: false, tour: "nav-goals" },
] as const;

const EXPENSE_CHANGED = "gastosai:expense-changed";
/** Spec §2: Piso holds `saved` for 1.2 s after a log, then falls back to the month's mood. */
const SAVED_MS = 1200;

/** `yyyy-mm` for today in Manila, which is the month the budget summary is keyed by. */
function currentMonth(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

/** A key typed into a field is text, not a shortcut. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;
  return target.closest("[contenteditable]:not([contenteditable='false'])") !== null;
}

export default function Navbar({ isDark, onToggleDark }: Props) {
  const { user, isAdmin, logout } = useAuth();
  const { entitlements } = useEntitlements();
  const [logging, setLogging] = useState(false);
  const [bands, setBands] = useState<BudgetBand[]>([]);
  // Assume there are expenses until told otherwise, so the mark never flashes `empty` on load.
  const [hasExpenses, setHasExpenses] = useState(true);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      getBudgetSummary(currentMonth())
        .then((s) => alive && setBands(s.items.map((item) => toBand(item.status))))
        .catch(() => {});
      getExpensesPage({ page: 0, size: 1 })
        .then((p) => alive && setHasExpenses(p.totalElements > 0))
        .catch(() => {});
    };
    load();
    window.addEventListener(EXPENSE_CHANGED, load);
    return () => {
      alive = false;
      window.removeEventListener(EXPENSE_CHANGED, load);
    };
  }, []);

  useEffect(() => {
    if (savedAt === null) return;
    const timer = window.setTimeout(() => setSavedAt(null), SAVED_MS);
    return () => window.clearTimeout(timer);
  }, [savedAt]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      if (isTextEntry(e.target)) return;
      e.preventDefault();
      setLogging(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const mood = pisoMoodFor({ bands, hasExpenses, saved: savedAt !== null });

  const saveExpense = async (data: ExpenseRequest) => {
    await createExpense(data);
    setLogging(false);
    setSavedAt(Date.now());
    window.dispatchEvent(new CustomEvent(EXPENSE_CHANGED));
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-4 py-2 text-[15px] font-medium transition-colors ${
      isActive
        ? "bg-cta text-cta-fg"
        : "text-ink-2 hover:text-ink-hi hover:bg-surface-2"
    }`;

  return (
    <nav className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-edge-2 bg-nav px-5 backdrop-blur-md md:px-10">
      <div className="flex flex-1 items-center gap-2">
        {/* Outside the link, so an announced mood is read as itself rather than as the link's name. */}
        <span data-testid="nav-mood-mark" className="flex shrink-0">
          <Piso state={mood} size={24} />
        </span>
        <Link to="/" className="flex select-none items-center">
          <span className="font-display text-[21px] font-bold tracking-tight text-ink-hi">
            Gastos<span className="text-brand">AI</span>
          </span>
        </Link>
      </div>

      <div className="hidden items-center gap-1 md:flex">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            data-tour={item.tour}
            className={linkClass}
          >
            {item.label}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink to="/admin/submissions" className={linkClass}>
            Messages
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/admin/chat-audit" className={linkClass}>
            Chat Audit
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/admin/observability" className={linkClass}>
            Observability
          </NavLink>
        )}
        {BILLING_ENABLED && !isAdmin && entitlements?.plan !== "PREMIUM" && (
          <NavLink to="/pricing" className={linkClass}>
            <Zap className="h-3.5 w-3.5" />
            Upgrade
          </NavLink>
        )}
      </div>

      <div className="flex flex-1 items-center justify-end gap-2.5">
        <Button
          size="sm"
          onClick={() => setLogging(true)}
          aria-label="Log expense"
          aria-keyshortcuts="n"
          title="Log expense (N)"
          data-testid="nav-log-expense"
          className="shrink-0 px-3 sm:px-4"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Log expense</span>
        </Button>
        {isAdmin && <AdminViewAsToggle />}
        <TipsPopover />
        <NotificationBell />
        <button
          onClick={onToggleDark}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Light mode" : "Dark mode"}
          className="flex rounded-full p-2 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink-hi"
        >
          {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
        {user && (
          <>
            <NavLink
              to="/settings"
              title="Profile settings"
              data-tour="nav-settings"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-full p-1 pr-1 transition-colors ${
                  isActive ? "bg-surface-2" : "hover:bg-surface-2"
                }`
              }
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(user.avatarColor)}`}
              >
                {avatarIconFor(user.avatar)
                  ? createElement(avatarIconFor(user.avatar)!, { className: "h-4 w-4 text-white" })
                  : <span className="select-none text-xs font-semibold leading-none text-white">{getInitials(user.name)}</span>}
              </span>
              <span className="hidden max-w-[100px] truncate pr-2 text-[15px] font-medium text-ink-hi lg:block">
                {user.nickname || user.name}
              </span>
            </NavLink>
            <button
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
              className="flex cursor-pointer rounded-full p-2 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink-hi"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </>
        )}
      </div>

      {logging && <ExpenseModal onSave={saveExpense} onClose={() => setLogging(false)} />}
    </nav>
  );
}
