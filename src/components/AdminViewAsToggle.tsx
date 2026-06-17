import { useState } from "react";
import { Eye } from "lucide-react";
import { VIEW_AS_CHANGED_EVENT } from "../api/entitlements";

const PLAN_KEY = "gastosai:viewas:plan";
const AI_KEY = "gastosai:viewas:ai";
const ROLE_KEY = "gastosai:viewas:role";

function read(key: string, fallback: string) {
  return localStorage.getItem(key) ?? fallback;
}

/**
 * Admin-only "View As" switcher: preview the app as a Free/Premium tier, with AI on/off, and as a
 * regular user. Writes localStorage overrides (sent as X-View-As-* headers by the api client) and
 * notifies entitlement/AI hooks to refetch. Backend ignores the headers for non-admins.
 */
export default function AdminViewAsToggle() {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(() => read(PLAN_KEY, "ADMIN"));
  const [ai, setAi] = useState(() => read(AI_KEY, "on"));
  const [role, setRole] = useState(() => read(ROLE_KEY, "ADMIN"));

  const apply = (nextPlan: string, nextAi: string, nextRole: string) => {
    setPlan(nextPlan); setAi(nextAi); setRole(nextRole);
    // ADMIN plan / on AI / ADMIN role = no override → clear the key.
    if (nextPlan === "ADMIN") localStorage.removeItem(PLAN_KEY); else localStorage.setItem(PLAN_KEY, nextPlan);
    if (nextAi === "on") localStorage.removeItem(AI_KEY); else localStorage.setItem(AI_KEY, nextAi);
    if (nextRole === "ADMIN") localStorage.removeItem(ROLE_KEY); else localStorage.setItem(ROLE_KEY, nextRole);
    window.dispatchEvent(new CustomEvent(VIEW_AS_CHANGED_EVENT));
  };

  const active = plan !== "ADMIN" || ai !== "on" || role !== "ADMIN";
  const selectCls = "w-full mt-1 text-sm rounded-lg border border-edge-input bg-input text-ink px-2 py-1.5";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="View as (admin)"
        aria-label="View as (admin)"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
          active ? "bg-amber-400/90 text-amber-950" : "text-ink-2 hover:text-ink-hi hover:bg-surface-2"
        }`}
      >
        <Eye className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{active ? "Viewing as…" : "View as"}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-60 z-50 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-3 text-gray-900 dark:text-gray-100">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">View as (admin)</p>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
              Plan
              <select value={plan} onChange={(e) => apply(e.target.value, ai, role)} className={selectCls}>
                <option value="ADMIN">Admin (all features)</option>
                <option value="PREMIUM">Premium user</option>
                <option value="FREE">Free user</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
              AI
              <select value={ai} onChange={(e) => apply(plan, e.target.value, role)} className={selectCls}>
                <option value="on">On (use my key)</option>
                <option value="off">Off (simulate no key)</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
              Role
              <select value={role} onChange={(e) => apply(plan, ai, e.target.value)} className={selectCls}>
                <option value="ADMIN">Admin</option>
                <option value="USER">Regular user</option>
              </select>
            </label>
            {active && (
              <button
                onClick={() => apply("ADMIN", "on", "ADMIN")}
                className="w-full text-xs font-semibold text-link hover:underline pt-1"
              >
                Reset to admin
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
