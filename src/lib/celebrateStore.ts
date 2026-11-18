const PREFIX = "ga.celebrate.";

/**
 * The flag is per account, so a second user on the same browser gets their own celebrations and
 * the first does not get theirs replayed on signing back in. Keyed by account rather than
 * cleared on logout: a logout clear would also wipe the first user's seen state, replaying
 * everything when they return. The account is the signed-in email from `useAuth()`; callers with
 * no account play nothing, so there is no signed-out scope. It is folded to an FNV-1a hash so the
 * raw email never sits in a storage key; a collision only means one skipped cheer. Same fold as
 * mobile.
 */
export function celebrationKey(account: string, event: string): string {
  let h = 0x811c9dc5;
  for (const ch of account.trim().toLowerCase()) {
    h = Math.imul(h ^ ch.codePointAt(0)!, 0x01000193);
  }
  return `${PREFIX}${(h >>> 0).toString(16).padStart(8, "0")}.${event}`;
}

/**
 * Whether a celebration has played. A storage failure answers "yes": skipping a celebration is
 * harmless, replaying one on every visit is the failure this store exists to prevent.
 */
export function hasCelebrated(account: string, event: string): boolean {
  try {
    return localStorage.getItem(celebrationKey(account, event)) === "1";
  } catch {
    return true;
  }
}

/** Records the event as seen. `false` means the flag could not be written, so it cannot hold. */
export function markCelebrated(account: string, event: string): boolean {
  try {
    localStorage.setItem(celebrationKey(account, event), "1");
    return true;
  } catch {
    return false;
  }
}
