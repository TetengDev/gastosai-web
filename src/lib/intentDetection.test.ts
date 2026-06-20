import { describe, it, expect } from "vitest";
import { looksLikeNlQuery, looksLikeExpenseLog } from "./intentDetection";

describe("looksLikeNlQuery — chatbot CRUD routing", () => {
  const NOT_NL = (phrase: string) =>
    expect(looksLikeNlQuery(phrase), `"${phrase}" should NOT be NL query`).toBe(false);
  const IS_NL = (phrase: string) =>
    expect(looksLikeNlQuery(phrase), `"${phrase}" SHOULD be NL query`).toBe(true);

  it("list my goals is NOT an NL query", () => NOT_NL("list my goals"));
  it("show my goals is NOT an NL query", () => NOT_NL("show my goals"));
  it("my goals is NOT an NL query", () => NOT_NL("my goals"));

  it("list my budgets is NOT an NL query", () => NOT_NL("list my budgets"));
  it("show my budgets is NOT an NL query", () => NOT_NL("show my budgets"));
  it("my budgets is NOT an NL query", () => NOT_NL("my budgets"));

  it("list my recurring is NOT an NL query", () => NOT_NL("list my recurring"));
  it("show my recurring is NOT an NL query", () => NOT_NL("show my recurring"));
  it("my recurring is NOT an NL query", () => NOT_NL("my recurring"));

  it("list my alerts is NOT an NL query", () => NOT_NL("list my alerts"));
  it("show my alerts is NOT an NL query", () => NOT_NL("show my alerts"));
  it("my alerts is NOT an NL query", () => NOT_NL("my alerts"));

  it("upcoming bills is NOT an NL query", () => NOT_NL("upcoming bills"));
  it("upcoming payments is NOT an NL query", () => NOT_NL("upcoming payments"));

  it("monthly report is NOT an NL query", () => NOT_NL("monthly report"));
  it("spending report is NOT an NL query", () => NOT_NL("spending report"));

  it("search expenses is NOT an NL query", () => NOT_NL("search expenses"));
  it("find expenses is NOT an NL query", () => NOT_NL("find expenses"));
  it("search for expenses is NOT an NL query", () => NOT_NL("search for expenses"));

  it("category totals is NOT an NL query", () => NOT_NL("category totals"));
  it("get category totals is NOT an NL query", () => NOT_NL("get category totals"));

  it("list bills is NOT an NL query", () => NOT_NL("list bills"));
  it("show my bills is NOT an NL query", () => NOT_NL("show my bills"));

  it("create a budget for food ₱5000 is NOT an NL query", () => NOT_NL("create a budget for food ₱5000"));
  it("delete goal Emergency Fund is NOT an NL query", () => NOT_NL("delete goal Emergency Fund"));

  it("how much did I spend this month IS an NL query", () => IS_NL("how much did I spend this month"));
  it("what did I spend on food? IS an NL query", () => IS_NL("what did I spend on food?"));
  it("how much did I spend last week IS an NL query", () => IS_NL("how much did I spend last week"));
  it("show me my top expenses this month IS an NL query", () => IS_NL("show me my top expenses this month"));
});

describe("looksLikeExpenseLog — chatbot CRUD routing guard", () => {
  it("list my goals is NOT an expense log", () => {
    expect(looksLikeExpenseLog("list my goals")).toBe(false);
  });
  it("show my alerts is NOT an expense log", () => {
    expect(looksLikeExpenseLog("show my alerts")).toBe(false);
  });
  it("upcoming bills is NOT an expense log", () => {
    expect(looksLikeExpenseLog("upcoming bills")).toBe(false);
  });
  it("spent 250 on lunch is an expense log", () => {
    expect(looksLikeExpenseLog("spent 250 on lunch")).toBe(true);
  });
});
