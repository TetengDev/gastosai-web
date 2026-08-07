import { describe, expect, it } from "vitest";
import { TIPS, dismissTip, getDismissedTips, resetTips } from "../lib/tips";
import { createMemoryStorage } from "./memoryStorage";

// The default-argument path: helpers fall back to `localStorage`, which setup.ts
// owns, so these do not depend on which storage global the host exposes.
describe("tips helpers", () => {
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

describe("tips helpers with an injected storage", () => {
  it("reads and writes the storage it is given, not the global", () => {
    const storage = createMemoryStorage();

    dismissTip(TIPS[0].id, storage);

    expect(getDismissedTips(storage)).toEqual([TIPS[0].id]);
    expect(getDismissedTips()).toEqual([]);

    resetTips(storage);
    expect(getDismissedTips(storage)).toEqual([]);
  });

  it("degrades to a no-op when no storage is available", () => {
    expect(getDismissedTips(null)).toEqual([]);
    expect(() => dismissTip(TIPS[0].id, null)).not.toThrow();
    expect(() => resetTips(null)).not.toThrow();
  });
});
