import { LogOut, Moon, Sun } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAvatarGradient, getInitials } from "../lib/formatters";
import AdminViewAsToggle from "./AdminViewAsToggle";
import { NotificationBell } from "./NotificationBell";

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

export default function Navbar({ isDark, onToggleDark }: Props) {
  const { user, isAdmin, logout } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
      isActive
        ? "bg-white/20 text-white backdrop-blur-sm shadow-inner"
        : "text-white/70 hover:text-white hover:bg-white/10"
    }`;

  return (
    <nav className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 shadow-lg shadow-indigo-600/20">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2">
        <Link to="/" className="mr-4 shrink-0 text-white font-extrabold text-lg tracking-tight select-none">
          Gastos<span className="text-indigo-300">AI</span>
        </Link>
        <NavLink to="/" end className={linkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/expenses" className={linkClass} data-tour="nav-expenses">
          Expenses
        </NavLink>
        <NavLink to="/categories" className={linkClass}>
          Categories
        </NavLink>
        <NavLink to="/budget" className={linkClass} data-tour="nav-budget">
          Budget
        </NavLink>
        <NavLink to="/recurring" className={linkClass} data-tour="nav-recurring">
          Recurring
        </NavLink>
        <NavLink to="/goals" className={linkClass} data-tour="nav-goals">
          Goals
        </NavLink>
        <div className="ml-auto flex items-center gap-1">
          {isAdmin && <AdminViewAsToggle />}
          <NotificationBell />
          <button
            onClick={onToggleDark}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/15 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {user && (
            <>
              <NavLink
                to="/settings"
                title="Profile settings"
                data-tour="nav-settings"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-2 py-1 rounded-xl transition-all duration-200 ${
                    isActive ? "bg-white/20" : "hover:bg-white/15"
                  }`
                }
              >
                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarGradient(user.avatarColor)} border border-white/50 flex items-center justify-center shrink-0`}>
                  <span className="text-white text-xs font-bold leading-none select-none">
                    {getInitials(user.name)}
                  </span>
                </div>
                <span className="hidden sm:block text-xs text-white/90 font-medium max-w-[100px] truncate">
                  {user.nickname || user.name}
                </span>
              </NavLink>
              <button
                onClick={logout}
                aria-label="Sign out"
                title="Sign out"
                className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
