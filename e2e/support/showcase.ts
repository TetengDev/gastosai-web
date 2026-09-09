import type { APIRequestContext } from "@playwright/test";
import { API_BASE } from "./auth";
import { apiHeaders, sweepRunData } from "./cleanup";

/**
 * The shape of the showcase walkthrough, kept beside the caption helper rather than inside
 * `showcase.demo.ts`, so the story is one list a reader (and `showcase.demo.test.ts`) can check
 * against the issue's acceptance criteria without reading the whole walkthrough.
 *
 * Order is the order they are filmed in — the video is one continuous story, so a scene moved
 * here is a scene moved on screen.
 */
export interface Scene {
  /** Stable id, used by the walkthrough to label its section and by the test to match. */
  readonly id: string;
  /** The chapter caption shown on screen when the scene opens. */
  readonly title: string;
}

export const SHOWCASE_SCENES: readonly Scene[] = [
  { id: "sign-in", title: "Sign in to GastosAI" },
  { id: "dashboard", title: "The dashboard: where the money went" },
  { id: "add-expense", title: "Add an expense — watch the total move" },
  { id: "budgets", title: "Budgets, and the 50 / 30 / 20 rule" },
  { id: "goals", title: "A savings goal, with progress" },
  { id: "recurring", title: "Recurring bills, and what is due" },
  { id: "assistant", title: "Ask the AI assistant" },
  { id: "export", title: "Export everything as CSV" },
] as const;

/** The scene with this id, so the walkthrough names a caption once and cannot mistype it. */
export function scene(id: string): Scene {
  const found = SHOWCASE_SCENES.find((s) => s.id === id);
  if (!found) throw new Error(`unknown showcase scene: ${id}`);
  return found;
}

/**
 * What the showcase changed outside its own `RUN_ID`-stamped rows.
 *
 * `sweepRunData` finds anything named after the run, which is every row the walkthrough creates.
 * Two things it cannot see: a chat conversation (its title comes from the question, not from a
 * name the run chose) and the account-level budgeting-rule toggle. Both are recorded here as the
 * walkthrough goes, so the sweep can undo them even when the walkthrough failed half way.
 */
export interface ShowcaseTraces {
  /** Conversations the assistant scene created, by id. */
  conversationIds: string[];
  /**
   * The budgeting rule exactly as the account had it, captured only when this run turned the rule
   * on itself. Left `null` when the account already had it on, because then the rule is the user's
   * own setting and neither its numbers nor its switch are ours to touch.
   */
  budgetRuleBefore: BudgetRuleSnapshot | null;
}

/** The fields `PUT /budget-rules` round-trips, which is everything the showcase can change. */
export interface BudgetRuleSnapshot {
  ruleType: string;
  monthlyIncome: number;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
}

export const newTraces = (): ShowcaseTraces => ({ conversationIds: [], budgetRuleBefore: null });

/** The account's current budgeting rule, for the walkthrough to put back afterwards. */
export async function readBudgetRule(
  request: APIRequestContext
): Promise<{ enabled: boolean; snapshot: BudgetRuleSnapshot } | null> {
  const headers = await apiHeaders(request);
  const res = await request.get(`${API_BASE}/budget-rules`, { headers });
  if (!res.ok()) return null;
  const rule = (await res.json()) as { enabled: boolean } & BudgetRuleSnapshot;
  return {
    enabled: rule.enabled,
    snapshot: {
      ruleType: rule.ruleType,
      monthlyIncome: rule.monthlyIncome,
      needsPct: rule.needsPct,
      wantsPct: rule.wantsPct,
      savingsPct: rule.savingsPct,
    },
  };
}

/**
 * Undo everything the showcase did — its rows, its conversations, and the budgeting-rule toggle.
 *
 * Runs from `afterEach`, so it runs whether the walkthrough passed or threw. Every step is
 * independent: a conversation that will not delete must not stop the expense from being swept.
 */
export async function sweepShowcase(
  request: APIRequestContext,
  traces: ShowcaseTraces
): Promise<string[]> {
  const removed = await sweepRunData(request);

  if (traces.conversationIds.length > 0 || traces.budgetRuleBefore) {
    const headers = await apiHeaders(request);

    for (const id of traces.conversationIds) {
      const gone = await request.delete(`${API_BASE}/chat/conversations/${id}`, { headers });
      if (gone.ok()) {
        removed.push(`conversation ${id}`);
      } else {
        console.warn(`showcase cleanup could not delete conversation ${id}: HTTP ${gone.status()}`);
      }
    }

    if (traces.budgetRuleBefore) {
      // Numbers first, then the switch: the showcase typed an income into the rule, and turning
      // the feature off does not erase it — it only hides it until the next time it is turned on.
      const back = await request.put(`${API_BASE}/budget-rules`, {
        headers,
        data: traces.budgetRuleBefore,
      });
      if (!back.ok()) {
        console.warn(`showcase cleanup could not restore the budgeting rule: HTTP ${back.status()}`);
      }
      const off = await request.put(`${API_BASE}/budget-rules/enabled`, {
        headers,
        data: { enabled: false },
      });
      if (off.ok()) {
        removed.push("budgeting rule (restored and switched back off)");
      } else {
        console.warn(`showcase cleanup could not disable the budgeting rule: HTTP ${off.status()}`);
      }
    }
  }

  return removed;
}
