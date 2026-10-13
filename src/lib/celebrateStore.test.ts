import { afterEach, describe, expect, it, vi } from "vitest";
import { hasCelebrated, markCelebrated } from "./celebrateStore";

describe("celebrateStore", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is unseen until marked, then seen", () => {
    expect(hasCelebrated("goal-7")).toBe(false);
    markCelebrated("goal-7");
    expect(hasCelebrated("goal-7")).toBe(true);
    expect(localStorage.getItem("ga.celebrate.goal-7")).toBe("1");
  });

  it("reads as already seen when storage throws, so nothing plays", () => {
    vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(hasCelebrated("goal-7")).toBe(true);
  });

  it("does not throw when storage cannot be written", () => {
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => markCelebrated("goal-7")).not.toThrow();
  });
});
