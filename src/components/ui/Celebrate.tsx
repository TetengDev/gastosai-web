import { useState, type ReactNode } from "react";
import Piso from "../../brand/Piso";
import { useAuth } from "../../context/AuthContext";
import { hasCelebrated, markCelebrated } from "../../lib/celebrateStore";

interface Props {
  /** Seen-flag key: `goal-<id>`, `month-<yyyy-mm>` or `first-expense`. */
  event: string;
  size?: number;
  /** Rendered instead when the celebration does not play, so its slot is never left blank. */
  fallback?: ReactNode;
}

/**
 * Mount it only when the trigger holds. Spec §3: on mount it marks the event seen first and only
 * then plays, so a remount (StrictMode, navigation) finds the flag and cannot replay it. React
 * keeps the first initializer result when StrictMode calls it twice. A flag that cannot be
 * written skips the animation, because nothing would stop it replaying on every visit. The flag
 * is per account, so with nobody signed in nothing plays and nothing is marked (as on mobile).
 */
export default function Celebrate({ event, size = 96, fallback = null }: Props) {
  const account = useAuth().user?.email;
  const [playing] = useState(
    () => !!account && !hasCelebrated(account, event) && markCelebrated(account, event),
  );

  if (!playing) return fallback;

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <Piso state="cheer" size={size} />
      <span
        data-testid="coin"
        aria-hidden="true"
        className="animate-coin-drop absolute top-0 h-4 w-4 rounded-full border-2 border-warn-ink bg-warn-edge opacity-0"
        style={{ left: "calc(50% - 8px)" }}
      />
    </div>
  );
}
