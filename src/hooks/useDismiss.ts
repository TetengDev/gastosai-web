import { useEffect, useRef } from "react";

/**
 * Closes an open popover on Escape or on a click anywhere outside the element the returned ref is
 * put on (the popover's toggle plus its panel). A `fixed inset-0` click-away layer cannot do this
 * inside the nav: its backdrop blur makes it the containing block, pinning the layer to the bar.
 *
 * The closing click is swallowed, as the old layer swallowed it, so it does not also follow a link
 * or press a button under it — including another popover's toggle. A capture-phase `click` covers
 * taps too: a browser synthesises one, and React's listener on the root lets iOS deliver it.
 */
export function useDismiss<T extends HTMLElement>(
  open: boolean,
  close: () => void,
) {
  const root = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (root.current?.contains(e.target as Node)) return;
      // Enter/Space on a control (or a programmatic click) fires detail 0: close, never swallow.
      if (e.detail === 0) {
        close();
        return;
      }
      // Hidden by a breakpoint while open (Menu at 768px, then 1024px): close, but let the click
      // through, since nobody can see what would have swallowed it. Without checkVisibility
      // (jsdom, Safari before 17.4) the popover counts as visible.
      if (root.current?.checkVisibility?.() !== false) {
        e.preventDefault();
        e.stopPropagation();
      }
      close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);
  return root;
}
