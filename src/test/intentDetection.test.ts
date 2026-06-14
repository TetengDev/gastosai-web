import { describe, it, expect } from "vitest";
import {
  looksLikeExpenseLog,
  looksLikeNlQuery,
  EXPENSE_LOG_KEYWORDS,
  QUERY_PHRASES,
  CRUD_WORD_KEYWORDS,
  CRUD_PHRASE_KEYWORDS,
} from "../lib/intentDetection";

describe("EXPENSE_LOG_KEYWORDS", () => {
  it("is a non-empty array of strings", () => {
    expect(Array.isArray(EXPENSE_LOG_KEYWORDS)).toBe(true);
    expect(EXPENSE_LOG_KEYWORDS.length).toBeGreaterThan(0);
    EXPENSE_LOG_KEYWORDS.forEach((k) => expect(typeof k).toBe("string"));
  });
});

describe("QUERY_PHRASES", () => {
  it("is a non-empty array of strings", () => {
    expect(Array.isArray(QUERY_PHRASES)).toBe(true);
    expect(QUERY_PHRASES.length).toBeGreaterThan(0);
    QUERY_PHRASES.forEach((q) => expect(typeof q).toBe("string"));
  });
});

describe("looksLikeExpenseLog", () => {
  // --- keyword matches (should return true) ---
  it("returns true for 'spent 200 on lunch'", () => {
    expect(looksLikeExpenseLog("spent 200 on lunch")).toBe(true);
  });

  it("returns true for 'bought groceries 500'", () => {
    expect(looksLikeExpenseLog("bought groceries 500")).toBe(true);
  });

  it("returns true for 'nagbayad ng kuryente 1500'", () => {
    expect(looksLikeExpenseLog("nagbayad ng kuryente 1500")).toBe(true);
  });

  it("returns true for 'paid 350 for Grab'", () => {
    expect(looksLikeExpenseLog("paid 350 for Grab")).toBe(true);
  });

  it("returns true for 'purchased coffee 120'", () => {
    expect(looksLikeExpenseLog("purchased coffee 120")).toBe(true);
  });

  it("returns true for 'ordered pizza 450'", () => {
    expect(looksLikeExpenseLog("ordered pizza 450")).toBe(true);
  });

  it("returns true for 'nagkain jollibee 200'", () => {
    expect(looksLikeExpenseLog("nagkain jollibee 200")).toBe(true);
  });

  it("returns true for 'bumili ng gamot 80'", () => {
    expect(looksLikeExpenseLog("bumili ng gamot 80")).toBe(true);
  });

  // --- currency matches (should return true) ---
  it("returns true for '100 pesos'", () => {
    expect(looksLikeExpenseLog("100 pesos")).toBe(true);
  });

  it("returns true for '₱200 grab'", () => {
    expect(looksLikeExpenseLog("₱200 grab")).toBe(true);
  });

  it("returns true for 'PHP 500 groceries'", () => {
    expect(looksLikeExpenseLog("PHP 500 groceries")).toBe(true);
  });

  it("returns true for 'php 1000 rent'", () => {
    expect(looksLikeExpenseLog("php 1000 rent")).toBe(true);
  });

  // --- amount with no query phrase (should return true) ---
  it("returns true for 'food panda 200'", () => {
    expect(looksLikeExpenseLog("food panda 200")).toBe(true);
  });

  it("returns true for 'grab 150 today'", () => {
    expect(looksLikeExpenseLog("grab 150 today")).toBe(true);
  });

  it("returns true for 'mcdo 99'", () => {
    expect(looksLikeExpenseLog("mcdo 99")).toBe(true);
  });

  // --- query phrases (should return false) ---
  it("returns false for 'how much did I spend?'", () => {
    expect(looksLikeExpenseLog("how much did I spend?")).toBe(false);
  });

  it("returns false for 'show my expenses'", () => {
    expect(looksLikeExpenseLog("show my expenses")).toBe(false);
  });

  it("returns false for 'what is my total'", () => {
    expect(looksLikeExpenseLog("what is my total")).toBe(false);
  });

  it("returns false for 'list all expenses 2024'", () => {
    expect(looksLikeExpenseLog("list all expenses 2024")).toBe(false);
  });

  it("returns false for 'how many expenses did i have'", () => {
    expect(looksLikeExpenseLog("how many expenses did i have")).toBe(false);
  });

  it("returns false for 'magkano na ang gastos ko'", () => {
    expect(looksLikeExpenseLog("magkano na ang gastos ko")).toBe(false);
  });

  // --- question mark blocked (should return false) ---
  it("returns false for 'food panda 200?'", () => {
    expect(looksLikeExpenseLog("food panda 200?")).toBe(false);
  });

  it("returns false for 'grab 150?'", () => {
    expect(looksLikeExpenseLog("grab 150?")).toBe(false);
  });

  // --- no digit, no keyword (should return false) ---
  it("returns false for 'hello world'", () => {
    expect(looksLikeExpenseLog("hello world")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(looksLikeExpenseLog("")).toBe(false);
  });

  it("returns false for text with no digits and no keywords", () => {
    expect(looksLikeExpenseLog("going to the park")).toBe(false);
  });

  // --- edge cases ---
  it("is case-insensitive for keyword detection", () => {
    expect(looksLikeExpenseLog("SPENT 300 on dinner")).toBe(true);
  });

  it("is case-insensitive for currency detection", () => {
    expect(looksLikeExpenseLog("Pesos 500")).toBe(true);
  });

  it("returns true for 'charged 1200 to credit card'", () => {
    expect(looksLikeExpenseLog("charged 1200 to credit card")).toBe(true);
  });

  // --- CRUD action keywords must NOT be treated as expense logs ---
  it("returns false for 'create a budget for food ₱5000'", () => {
    expect(looksLikeExpenseLog("create a budget for food ₱5000")).toBe(false);
  });

  it("returns false for 'add a goal for vacation 10000'", () => {
    expect(looksLikeExpenseLog("add a goal for vacation 10000")).toBe(false);
  });

  it("returns false for 'set up recurring rent 8000'", () => {
    expect(looksLikeExpenseLog("set up recurring rent 8000")).toBe(false);
  });

  it("returns false for 'delete expense 5'", () => {
    expect(looksLikeExpenseLog("delete expense 5")).toBe(false);
  });

  it("returns false for 'update my budget for groceries ₱3000'", () => {
    expect(looksLikeExpenseLog("update my budget for groceries ₱3000")).toBe(false);
  });

  // --- query with past-tense expense keyword must NOT match (issue: "spent" in query context) ---
  it("returns false for 'how much did I spent for this month'", () => {
    expect(looksLikeExpenseLog("how much did I spent for this month")).toBe(false);
  });

  it("returns false for 'how much did I paid last week'", () => {
    expect(looksLikeExpenseLog("how much did I paid last week")).toBe(false);
  });
});

describe("CRUD_WORD_KEYWORDS", () => {
  it("is a non-empty array of strings", () => {
    expect(Array.isArray(CRUD_WORD_KEYWORDS)).toBe(true);
    expect(CRUD_WORD_KEYWORDS.length).toBeGreaterThan(0);
    CRUD_WORD_KEYWORDS.forEach((k) => expect(typeof k).toBe("string"));
  });
});

describe("CRUD_PHRASE_KEYWORDS", () => {
  it("is a non-empty array of strings", () => {
    expect(Array.isArray(CRUD_PHRASE_KEYWORDS)).toBe(true);
    expect(CRUD_PHRASE_KEYWORDS.length).toBeGreaterThan(0);
    CRUD_PHRASE_KEYWORDS.forEach((k) => expect(typeof k).toBe("string"));
  });
});

describe("looksLikeNlQuery", () => {
  it("returns true for questions with question mark", () => {
    expect(looksLikeNlQuery("how much did I spent for this month?")).toBe(true);
  });

  it("returns true for query phrases without question mark", () => {
    expect(looksLikeNlQuery("how much did I spent for this month")).toBe(true);
  });

  it("returns true for 'show my expenses'", () => {
    expect(looksLikeNlQuery("show my expenses")).toBe(true);
  });

  it("returns true for 'list all expenses'", () => {
    expect(looksLikeNlQuery("list all expenses")).toBe(true);
  });

  it("returns false for CRUD commands even with question mark", () => {
    expect(looksLikeNlQuery("delete this expense?")).toBe(false);
  });

  it("returns false for 'create a budget for food'", () => {
    expect(looksLikeNlQuery("create a budget for food ₱5000")).toBe(false);
  });

  it("returns false for plain expense log", () => {
    expect(looksLikeNlQuery("paid 200 for lunch")).toBe(false);
  });
});
