import { describe, expect, it } from "vitest";
import { EXPENSE_CHANGED } from "./events";

describe("events", () => {
  it("pins the expense-changed window event name", () => {
    expect(EXPENSE_CHANGED).toBe("gastosai:expense-changed");
  });
});
