import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasCelebrated, markCelebrated } from "./celebrateStore";

const signIn = (email: string) =>
  localStorage.setItem("auth_user", JSON.stringify({ email, name: "N" }));

describe("celebrateStore", () => {
  beforeEach(() => signIn("a@example.com"));
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("is unseen until marked, then seen", () => {
    expect(hasCelebrated("goal-7")).toBe(false);
    markCelebrated("goal-7");
    expect(hasCelebrated("goal-7")).toBe(true);
  });

  it("does not let user B inherit the seen state user A built up on the same browser", () => {
    markCelebrated("first-expense");
    expect(hasCelebrated("first-expense")).toBe(true);

    localStorage.removeItem("auth_user"); // A logs out
    signIn("b@example.com"); // B logs in
    expect(hasCelebrated("first-expense")).toBe(false);
    expect(markCelebrated("first-expense")).toBe(true);

    localStorage.removeItem("auth_user");
    signIn("a@example.com"); // A comes back: still seen, not replayed
    expect(hasCelebrated("first-expense")).toBe(true);
  });

  it("treats the same account's email case and spacing as one account", () => {
    markCelebrated("goal-1");
    signIn("  A@Example.com ");
    expect(hasCelebrated("goal-1")).toBe(true);
  });

  it("keeps the raw email out of the storage key", () => {
    markCelebrated("goal-1");
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter(
      (k) => k.startsWith("ga.celebrate."),
    );
    expect(keys).toHaveLength(1);
    expect(keys[0]).not.toContain("example");
    expect(keys[0]).toMatch(/^ga\.celebrate\.[0-9a-f]{8}\.goal-1$/);
  });

  it("keeps signed-out flags apart from every account", () => {
    localStorage.removeItem("auth_user");
    markCelebrated("goal-2");
    signIn("a@example.com");
    expect(hasCelebrated("goal-2")).toBe(false);
  });

  it("scopes to nobody when auth_user is corrupt", () => {
    localStorage.setItem("auth_user", "{not json");
    expect(() => hasCelebrated("goal-3")).not.toThrow();
  });

  it("reads as already seen when storage throws, so nothing plays", () => {
    vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(hasCelebrated("goal-7")).toBe(true);
  });

  it("reports a failed write instead of throwing", () => {
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(markCelebrated("goal-7")).toBe(false);
  });

  it("reports a successful write", () => {
    expect(markCelebrated("goal-8")).toBe(true);
  });
});
