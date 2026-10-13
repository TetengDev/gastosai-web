import { useEffect, useState } from "react";
import Piso from "../../brand/Piso";
import { hasCelebrated, markCelebrated } from "../../lib/celebrateStore";

interface Props {
  /** Seen-flag key: `goal-<id>`, `month-<yyyy-mm>` or `first-expense`. */
  event: string;
  size?: number;
}

/**
 * Mount it only when the trigger holds. Whether to play is decided once, at mount, from storage;
 * the effect then records it, so a StrictMode remount keeps the decision and cannot replay it.
 */
export default function Celebrate({ event, size = 96 }: Props) {
  const [playing] = useState(() => !hasCelebrated(event));

  useEffect(() => {
    if (playing) markCelebrated(event);
  }, [playing, event]);

  if (!playing) return null;

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
