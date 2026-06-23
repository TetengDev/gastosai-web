import { Link } from "react-router-dom";
import { cn } from "./ui/cn";

interface Props {
  active: "login" | "register";
}

/**
 * Segmented Sign in / Create account switcher shown at the top of the auth card.
 * Makes the current mode unmistakable and the switch one tap away — the two auth
 * pages otherwise look near-identical.
 */
export default function AuthModeTabs({ active }: Props) {
  const tab = "flex-1 rounded-full py-2 text-center text-sm font-semibold transition-colors";
  const on = "bg-cta text-cta-fg shadow-sm";
  const off = "text-ink-2 hover:text-ink-hi";

  return (
    <div className="mb-6 flex gap-1 rounded-full border border-edge-input bg-surface-2 p-1">
      <Link
        to="/login"
        aria-current={active === "login" ? "page" : undefined}
        className={cn(tab, active === "login" ? on : off)}
      >
        Sign in
      </Link>
      <Link
        to="/register"
        aria-current={active === "register" ? "page" : undefined}
        className={cn(tab, active === "register" ? on : off)}
      >
        Create account
      </Link>
    </div>
  );
}
