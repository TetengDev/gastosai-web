import { NavLink } from "react-router-dom";

export default function Navbar() {
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
      </div>
    </nav>
  );
}
