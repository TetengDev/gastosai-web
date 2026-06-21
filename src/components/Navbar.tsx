import { createElement } from "react";
import { LogOut, Moon, Sun } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAvatarGradient, getInitials } from "../lib/formatters";
import { avatarIconFor } from "../lib/avatarIcons";
import AdminViewAsToggle from "./AdminViewAsToggle";
import { NotificationBell } from "./NotificationBell";
import TipsPopover from "./TipsPopover";

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true, tour: undefined },
  { to: "/expenses", label: "Expenses", end: false, tour: "nav-expenses" },
  { to: "/categories", label: "Categories", end: false, tour: undefined },
  { to: "/budget", label: "Budget", end: false, tour: "nav-budget" },
  { to: "/recurring", label: "Recurring", end: false, tour: "nav-recurring" },
  { to: "/goals", label: "Goals", end: false, tour: "nav-goals" },
] as const;

export default function Navbar({ isDark, onToggleDark }: Props) {
  const { user, isAdmin, logout } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-4 py-2 text-[15px] font-medium transition-colors ${
      isActive
        ? "bg-cta text-cta-fg"
        : "text-ink-2 hover:text-ink-hi hover:bg-surface-2"
    }`;

  return (
    <nav className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-edge-2 bg-nav px-5 backdrop-blur-md md:px-10">
      <Link to="/" className="flex flex-1 select-none items-center">
        <span className="font-display text-[21px] font-bold tracking-tight text-ink-hi">
          Gastos<span className="text-brand">AI</span>
        </span>
      </Link>

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
      </div>

      <div className="flex flex-1 items-center justify-end gap-2.5">
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
    </nav>
  );
}
