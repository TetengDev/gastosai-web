import type { KeyValueStorage } from "./storage";

/**
 * The two-state dark-mode toggle (modern-web-guidance `dark-mode-toggle`).
 *
 * With nothing stored the page follows the OS through `<meta name="color-scheme" content="light dark">`.
 * A stored value is an override, and is only ever the opposite of the OS at the moment it was
 * stored. `index.html` applies it before first paint; this module decides what a toggle stores.
 */
export type ColorScheme = "light" | "dark";

/** Must match the key the inline script in `index.html` reads. */
export const COLOR_SCHEME_KEY = "color-scheme";

/** The pre-TEN-547 key, written on every load. Almost every value in it is an accidental pin. */
const LEGACY_THEME_KEY = "theme";

export function readOverride(storage: KeyValueStorage | null): ColorScheme | null {
  try {
    const value = storage?.getItem(COLOR_SCHEME_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

/** The scheme on screen: the override if there is one, otherwise the OS. */
export function resolveScheme(override: ColorScheme | null, systemDark: boolean): ColorScheme {
  return override ?? (systemDark ? "dark" : "light");
}

/**
 * Flip to the opposite of what is on screen. A target that matches the OS removes the stored value
 * instead of storing it, so the page follows the OS again rather than being pinned invisibly.
 * Divergence is checked only here, never when the OS later changes: a kept pin stays kept.
 *
 * Returns the new override even when storage fails, so the page still applies it.
 */
export function toggleColorScheme(
  current: ColorScheme | null,
  systemDark: boolean,
  storage: KeyValueStorage | null,
): ColorScheme | null {
  const target: ColorScheme = resolveScheme(current, systemDark) === "dark" ? "light" : "dark";
  const next = target === resolveScheme(null, systemDark) ? null : target;
  try {
    if (next) storage?.setItem(COLOR_SCHEME_KEY, next);
    else storage?.removeItem(COLOR_SCHEME_KEY);
  } catch {
    // Storage blocked or full: the choice holds for this page, it just does not persist.
  }
  return next;
}

/** Back to following the OS — what sign-out does, so the next person at the browser is not pinned. */
export function clearOverride(storage: KeyValueStorage | null): void {
  try {
    storage?.removeItem(COLOR_SCHEME_KEY);
  } catch {
    // Unusable storage holds no pin to clear.
  }
}

/** Drop the old key without migrating it; a user who chose deliberately toggles once more. */
export function clearLegacyTheme(storage: KeyValueStorage | null): void {
  try {
    storage?.removeItem(LEGACY_THEME_KEY);
  } catch {
    // Nothing to clean up if storage is unusable.
  }
}
