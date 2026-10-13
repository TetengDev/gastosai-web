const PREFIX = "ga.celebrate.";

/**
 * Whether a celebration has played. A storage failure answers "yes": skipping a celebration is
 * harmless, replaying one on every visit is the failure this store exists to prevent.
 */
export function hasCelebrated(event: string): boolean {
  try {
    return localStorage.getItem(PREFIX + event) === "1";
  } catch {
    return true;
  }
}

/** Records the event as seen. `false` means the flag could not be written, so it cannot hold. */
export function markCelebrated(event: string): boolean {
  try {
    localStorage.setItem(PREFIX + event, "1");
    return true;
  } catch {
    return false;
  }
}
