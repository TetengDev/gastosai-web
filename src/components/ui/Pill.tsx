import type { ReactNode } from "react";
import { cn } from "./cn";

interface Props {
  children: ReactNode;
  /** Optional leading dot color (CSS color value). */
  dotColor?: string;
  className?: string;
}

export default function Pill({ children, dotColor, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-edge-2 bg-surface-4 px-3 py-1 text-[13px] text-ink",
        className
      )}
    >
      {dotColor && (
        <span
          className="h-[7px] w-[7px] shrink-0 rounded-full"
          style={{ background: dotColor }}
        />
      )}
      {children}
    </span>
  );
}
