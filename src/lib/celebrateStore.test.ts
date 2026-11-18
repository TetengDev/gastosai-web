import { afterEach, describe, expect, it, vi } from "vitest";
import { celebrationKey, hasCelebrated, markCelebrated } from "./celebrateStore";

const A = "a@example.com";
const B = "b@example.com";

const celebrateKeys = () =>
  Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter((k) =>
    k.startsWith("ga.celebrate."),
  );

describe("celebrateStore", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is unseen until marked, then seen", () => {
    expect(hasCelebrated(A, "goal-7")).toBe(false);
    markCelebrated(A, "goal-7");
    expect(hasCelebrated(A, "goal-7")).toBe(true);
  });

  it("does not let user B inherit the seen state user A built up on the same browser", () => {
    markCelebrated(A, "first-expense");
    expect(hasCelebrated(B, "first-expense")).toBe(false);
    expect(markCelebrated(B, "first-expense")).toBe(true);
    expect(hasCelebrated(A, "first-expense")).toBe(true);
  });

  it("treats the same account's email case and spacing as one account", () => {
    markCelebrated(A, "goal-1");
    expect(hasCelebrated("  A@Example.com ", "goal-1")).toBe(true);
  });

  it("keeps the raw email out of the storage key", () => {
    markCelebrated(A, "goal-1");
    const keys = celebrateKeys();
    expect(keys).toEqual([celebrationKey(A, "goal-1")]);
    expect(keys[0]).not.toContain("example");
    expect(keys[0]).toMatch(/^ga\.celebrate\.[0-9a-f]{8}\.goal-1$/);
  });

  // The account comes from the caller (Celebrate reads useAuth()), never from AuthContext's
  // storage, so a stale `auth_user` record cannot change whose flag is read or written.
  it("scopes only by the account passed in, ignoring any auth_user record", () => {
    localStorage.setItem("auth_user", JSON.stringify({ email: B }));
    markCelebrated(A, "goal-2");
    expect(celebrateKeys()).toEqual([celebrationKey(A, "goal-2")]);
    expect(hasCelebrated(B, "goal-2")).toBe(false);
  });

  it("reads as already seen when storage throws, so nothing plays", () => {
    vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(hasCelebrated(A, "goal-7")).toBe(true);
  });

  it("reports a failed write instead of throwing", () => {
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(markCelebrated(A, "goal-7")).toBe(false);
  });

  it("reports a successful write", () => {
    expect(markCelebrated(A, "goal-8")).toBe(true);
  });
});
