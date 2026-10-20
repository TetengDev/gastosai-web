const PREFIX = "ga.celebrate.";

/** Scope used when nobody is signed in, so it can never collide with an account's hash. */
const SIGNED_OUT = "anon";

/**
 * The signed-in account's email, read from the `auth_user` record `AuthContext` persists. Read
 * here rather than passed in so callers keep the `(event)` signature; a missing or unreadable
 * record means signed out.
 */
function accountEmail(): string | null {
  try {
    const raw = localStorage.getItem("auth_user");
    if (!raw) return null;
    const email = (JSON.parse(raw) as { email?: unknown } | null)?.email;
    return typeof email === "string" && email.trim() ? email : null;
  } catch {
    return null;
  }
}

/**
 * The flag is per account, so a second user on the same browser gets their own celebrations and
 * the first does not get theirs replayed on signing back in. Keyed by account rather than
 * cleared on logout: a logout clear would also wipe the first user's seen state, replaying
 * everything when they return. The account is folded to an FNV-1a hash so the raw email never
 * sits in a storage key; a collision only means one skipped cheer. Same fold as mobile.
 */
export function celebrationKey(event: string): string {
  const email = accountEmail();
  let scope = SIGNED_OUT;
  if (email) {
    let h = 0x811c9dc5;
    for (const ch of email.trim().toLowerCase()) {
      h = Math.imul(h ^ ch.codePointAt(0)!, 0x01000193);
    }
    scope = (h >>> 0).toString(16).padStart(8, "0");
  }
  return `${PREFIX}${scope}.${event}`;
}

/**
 * Whether a celebration has played. A storage failure answers "yes": skipping a celebration is
 * harmless, replaying one on every visit is the failure this store exists to prevent.
 */
export function hasCelebrated(event: string): boolean {
  try {
    return localStorage.getItem(celebrationKey(event)) === "1";
  } catch {
    return true;
  }
}

/** Records the event as seen. `false` means the flag could not be written, so it cannot hold. */
export function markCelebrated(event: string): boolean {
  try {
    localStorage.setItem(celebrationKey(event), "1");
    return true;
  } catch {
    return false;
  }
}
