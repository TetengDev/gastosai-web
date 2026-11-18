import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
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

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const focusables = (panel: HTMLElement) => Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));

/**
 * A modal dialog built by hand rather than on `<dialog>`, which would change its styling and the
 * e2e helpers that scope to `div.animate-pop`. It names itself by its title, closes on Escape,
 * keeps Tab inside, and hands focus back to whatever opened it.
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidthClass = "max-w-md",
}: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // The opener is read as `open` turns true, during that render: by the time an effect runs, an
  // autoFocus field inside has already taken focus.
  const [wasOpen, setWasOpen] = useState(open);
  const [opener, setOpener] = useState<HTMLElement | null>(() =>
    open ? (document.activeElement as HTMLElement | null) : null,
  );
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setOpener(document.activeElement as HTMLElement | null);
  }

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) (focusables(panel)[0] ?? panel).focus();
    // A gone opener (its row re-rendered elsewhere) is left alone; the page decides where focus goes.
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, [open, opener]);

  if (!open) return null;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      // A control inside that handles Escape itself (an open listbox) claims it with preventDefault.
      if (e.defaultPrevented) return;
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panelRef.current) return;
    const items = focusables(panelRef.current);
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(23,23,28,0.55)] p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cn(
          "animate-pop w-full rounded-[22px] border border-edge bg-surface p-8 outline-none",
          maxWidthClass
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-6 flex items-center justify-between">
            <h2 id={titleId} className="m-0 font-display text-[26px] font-medium tracking-tight text-ink-hi">
              {title}
            </h2>
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
