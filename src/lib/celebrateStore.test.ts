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
