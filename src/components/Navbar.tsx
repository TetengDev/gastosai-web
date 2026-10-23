import { createElement, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, LogOut, Moon, Plus, Shield, Sun, Zap } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getBudgetSummary } from "../api/budgets";
import { createExpense, getExpensesPage } from "../api/expenses";
import type { ExpenseRequest } from "../api/expenses";
import Piso from "../brand/Piso";
import { getAvatarGradient, getInitials, manilaMonth } from "../lib/formatters";
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

/** A key typed into a field is text, not a shortcut. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;
  return target.closest("[contenteditable]:not([contenteditable='false'])") !== null;
}

/**
 * Something already sits over the page. `ui/Modal`, which every form in the app opens in, has no
 * dialog role, so its full-viewport `fixed inset-0` overlay is the signal; the tour's tooltip is
 * `aria-modal`. The popovers' click-away layers match too, and that is wanted: close them first.
 */
function isOverlayOpen(): boolean {
  return document.querySelector("[aria-modal='true'], [role='dialog'], .fixed.inset-0") !== null;
}

const ADMIN_LINKS = [
  { to: "/admin/submissions", label: "Messages" },
  { to: "/admin/chat-audit", label: "Chat Audit" },
  { to: "/admin/observability", label: "Observability" },
];

/** The admin pages behind one nav button, so an admin's bar holds the same row as everyone else's. */
function AdminMenu() {
  const [open, setOpen] = useState(false);
  const active = useLocation().pathname.startsWith("/admin");
  return (
    <div className="relative" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <button
        type="button"
        aria-label="Admin"
        title="Admin pages"
        aria-expanded={open}
        aria-controls="admin-menu"
        onClick={() => setOpen((o) => !o)}
        className={`flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 text-[15px] font-medium transition-colors xl:px-4 ${
          active ? "bg-cta text-cta-fg" : "text-ink-2 hover:bg-surface-2 hover:text-ink-hi"
        }`}
      >
        <Shield className="h-4 w-4 xl:hidden" aria-hidden="true" />
        <span className="hidden xl:inline">Admin</span>
        <ChevronDown className={`hidden h-4 w-4 transition-transform xl:block ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <ul id="admin-menu" className="absolute left-0 z-50 mt-2 w-48 rounded-xl border border-edge bg-surface p-1.5 shadow-xl">
            {ADMIN_LINKS.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? "bg-surface-2 text-ink-hi" : "text-ink-2 hover:bg-surface-2 hover:text-ink-hi"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default function Navbar({ isDark, onToggleDark }: Props) {
  const { user, isAdmin, logout } = useAuth();
  const { entitlements } = useEntitlements();
  const [logging, setLogging] = useState(false);
  const [bands, setBands] = useState<BudgetBand[]>([]);
  // Assume there are expenses until told otherwise, so the mark never flashes `empty` on load.
  const [hasExpenses, setHasExpenses] = useState(true);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const { pathname } = useLocation();

  // Refetched on every navigation too: a budget edited on its own page fires no expense event.
  useEffect(() => {
    let alive = true;
    // Two saves in quick succession start two loads; only the newer one may land.
    let latest = 0;
    // A failed fetch keeps the last mood: the mark is decoration, and the pages report the error.
    const load = () => {
      const seq = ++latest;
      const current = () => alive && seq === latest;
      getBudgetSummary(manilaMonth())
        .then((s) => current() && setBands(s.items.map((item) => toBand(item.status))))
        .catch(() => {});
      getExpensesPage({ page: 0, size: 1 })
        .then((p) => current() && setHasExpenses(p.totalElements > 0))
        .catch(() => {});
    };
    load();
    window.addEventListener(EXPENSE_CHANGED, load);
    return () => {
      alive = false;
      window.removeEventListener(EXPENSE_CHANGED, load);
    };
  }, [pathname]);

  useEffect(() => {
    if (savedAt === null) return;
    const timer = window.setTimeout(() => setSavedAt(null), SAVED_MS);
    return () => window.clearTimeout(timer);
  }, [savedAt]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      if (e.isComposing || isTextEntry(e.target) || isOverlayOpen()) return;
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

  // Tighter below xl, where the six links share the bar with Log expense; at lg the 1024px nav
  // otherwise overflows by the width of the logout button.
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap rounded-full px-3 py-2 text-[15px] font-medium xl:px-4 transition-colors ${
      isActive
        ? "bg-cta text-cta-fg"
        : "text-ink-2 hover:text-ink-hi hover:bg-surface-2"
    }`;

  return (
    <nav className="sticky top-0 z-40 flex h-[72px] items-center justify-between gap-4 border-b border-edge-2 bg-nav px-3 backdrop-blur-md sm:px-5 xl:px-10">
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
        {isAdmin && <AdminMenu />}
        {BILLING_ENABLED && !isAdmin && entitlements?.plan !== "PREMIUM" && (
          <NavLink to="/pricing" className={linkClass}>
            <Zap className="h-3.5 w-3.5" />
            Upgrade
          </NavLink>
        )}
      </div>

      <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2.5">
        <Button
          size="sm"
          onClick={() => setLogging(true)}
          aria-label="Log expense"
          aria-keyshortcuts="n"
          title="Log expense (N)"
          data-testid="nav-log-expense"
          className="shrink-0 whitespace-nowrap px-2.5 xl:px-4"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {/* The full nav only has room for the label from xl, or from 1400px beside an admin's extra controls. */}
          <span className={isAdmin ? "hidden min-[1400px]:inline" : "hidden xl:inline"}>Log expense</span>
        </Button>
        {isAdmin && <AdminViewAsToggle />}
        {/* Below sm the bar cannot also hold Log expense; tips are the one control a phone can spare.
            An admin's extra controls need that room up to xl too. */}
        <span className={isAdmin ? "hidden xl:flex" : "hidden sm:flex"}>
          <TipsPopover />
        </span>
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
              {/* Shown only once the labelled Log expense button and the name both fit beside the nav. */}
              <span className="hidden max-w-[100px] truncate pr-2 text-[15px] font-medium text-ink-hi min-[1400px]:block">
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

      {/* Portalled out of the nav: its backdrop-blur makes it the containing block for the
          modal's fixed overlay, which would otherwise be pinned to the 72px bar. */}
      {logging &&
        createPortal(
          <ExpenseModal onSave={saveExpense} onClose={() => setLogging(false)} />,
          document.body,
        )}
    </nav>
  );
}
