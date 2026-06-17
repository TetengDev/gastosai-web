import { beforeEach, describe, expect, it } from "vitest";
import { TIPS, dismissTip, getDismissedTips, resetTips } from "../lib/tips";

describe("tips helpers", () => {
  beforeEach(() => localStorage.clear());

  it("starts with no dismissed tips", () => {
    expect(getDismissedTips()).toEqual([]);
  });

  it("dismissing a tip persists it (deduped)", () => {
    dismissTip(TIPS[0].id);
    dismissTip(TIPS[0].id);
    dismissTip(TIPS[1].id);
    const dismissed = getDismissedTips();
    expect(dismissed).toContain(TIPS[0].id);
    expect(dismissed).toContain(TIPS[1].id);
    expect(dismissed.filter((id) => id === TIPS[0].id)).toHaveLength(1);
  });

  it("reset clears all dismissals", () => {
    dismissTip(TIPS[0].id);
    resetTips();
    expect(getDismissedTips()).toEqual([]);
  });

  it("tolerates corrupt storage", () => {
    localStorage.setItem("gastosai:tips:dismissed", "not json");
    expect(getDismissedTips()).toEqual([]);
  });
});
