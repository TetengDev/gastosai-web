import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  );
}

export default function Navbar({ isDark, onToggleDark }: Props) {
  const { user, logout } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
      isActive
        ? "bg-white/20 text-white backdrop-blur-sm shadow-inner"
        : "text-white/70 hover:text-white hover:bg-white/10"
    }`;

  return (
    <nav className="sticky top-0 z-10 bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 shadow-lg shadow-indigo-500/20">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2">
        <div className="mr-4 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
            <span className="text-white text-sm font-black">G</span>
          </div>
          <span className="font-extrabold text-white text-lg tracking-tight">
            GastosAI
          </span>
        </div>
        <NavLink to="/" end className={linkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/expenses" className={linkClass}>
          Expenses
        </NavLink>
        <NavLink to="/categories" className={linkClass}>
          Categories
        </NavLink>
        <div className="ml-auto flex items-center gap-1">
          {user && (
            <span className="hidden sm:block text-xs text-white/60 mr-2 max-w-[140px] truncate">
              {user.name}
            </span>
          )}
          <button
            onClick={onToggleDark}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/15 transition-colors"
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
          {user && (
            <button
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
              className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            >
              <LogoutIcon />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
