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

export function markCelebrated(event: string): void {
  try {
    localStorage.setItem(PREFIX + event, "1");
  } catch {
    // Unwritable storage means it may play again next visit; that is the lesser failure.
  }
}
