import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Max width of the panel. Defaults to a standard form width. */
  maxWidthClass?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidthClass = "max-w-md",
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(23,23,28,0.55)] p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn(
          "animate-pop w-full rounded-[22px] border border-edge bg-surface p-8",
          maxWidthClass
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-6 flex items-center justify-between">
            <div className="font-display text-[26px] font-medium tracking-tight text-ink-hi">
              {title}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex cursor-pointer p-1 text-ink-3 transition-colors hover:text-ink-hi"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
