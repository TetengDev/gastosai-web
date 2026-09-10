// Helpers for chatbot CRUD action cards: labels, editable field specs, the structured confirm
// call, and the data-change event dispatcher. Extracted from ChatWidget; no UI or state here.

import api, { UNVERSIONED_BASE_URL } from "../../api/client";
import type { ChatResponseType } from "../../api/ai";
import type { components } from "../../api/generated/schema";

type Schemas = components["schemas"];

export function actionLabel(toolName: string): string {
  const labels: Record<string, string> = {
    create_budget: "New budget",
    create_goal: "New savings goal",
    create_recurring: "New recurring expense",
    create_expense: "New expense",
    update_budget: "Update budget",
    create_category: "New category",
    rename_category: "Rename category",
    delete_category: "Delete category",
    update_goal: "Update savings goal",
    update_recurring: "Update recurring expense",
    update_profile: "Update profile",
    list_goals: "Your savings goals",
    list_budgets: "Budget summary",
    list_recurring: "Recurring expenses",
    list_alerts: "Your alerts",
    search_expenses: "Expense search results",
    get_category_totals: "Category totals",
    get_monthly_report: "Monthly report",
    mark_alert_read: "Mark alert read",
    dismiss_alert: "Dismiss alert",
    delete_alert: "Delete alert",
    set_default_category: "Set default category",
    set_category_icon: "Set category icon",
    delete_expenses: "Delete expenses",
    recategorize_expenses: "Recategorize expenses",
  };
  return labels[toolName] ?? "Confirm action";
}

export function savedLabel(toolName: string): string {
  const labels: Record<string, string> = {
    create_budget: "Saved to budgets",
    create_goal: "Saved to goals",
    create_recurring: "Saved to recurring",
    create_expense: "Saved to expenses",
    update_budget: "Budget updated",
    create_category: "Category created",
    rename_category: "Category renamed",
    delete_category: "Category deleted",
    update_goal: "Goal updated",
    update_recurring: "Recurring updated",
    update_profile: "Profile updated",
    list_goals: "Done",
    list_budgets: "Done",
    list_recurring: "Done",
    list_alerts: "Done",
    search_expenses: "Done",
    get_category_totals: "Done",
    get_monthly_report: "Done",
    mark_alert_read: "Alert marked as read",
    dismiss_alert: "Alert dismissed",
    delete_alert: "Alert deleted",
    set_default_category: "Default category updated",
    set_category_icon: "Category icon updated",
    delete_expenses: "Expenses deleted",
    recategorize_expenses: "Expenses recategorized",
  };
  return labels[toolName] ?? "Saved";
}

export interface PreviewField {
  field: string;
  label: string;
  value: string;
  inputType: "text" | "number" | "month" | "date" | "select" | "freq-select";
}

export function buildPreviewFields(toolName: string, params: Record<string, unknown>, editedParams: Record<string, unknown>): PreviewField[] {
  const p = { ...params, ...editedParams };
  switch (toolName) {
    case "create_budget":
      return [
        { field: "categoryName", label: "Category", value: String(p.categoryName ?? ""), inputType: "select" },
        { field: "amountLimit", label: "Amount Limit (₱)", value: String(p.amountLimit ?? 0), inputType: "number" },
        { field: "month", label: "Month", value: String(p.month ?? new Date().toISOString().slice(0, 7)), inputType: "month" },
      ];
    case "create_goal":
      return [
        { field: "name", label: "Goal Name", value: String(p.name ?? ""), inputType: "text" },
        { field: "targetAmount", label: "Target Amount (₱)", value: String(p.targetAmount ?? 0), inputType: "number" },
        { field: "savedAmount", label: "Already Saved (₱)", value: String(p.savedAmount ?? 0), inputType: "number" },
        ...(p.targetDate ? [{ field: "targetDate", label: "Target Date", value: String(p.targetDate), inputType: "date" as const }] : []),
      ];
    case "create_recurring":
      return [
        { field: "name", label: "Name", value: String(p.name ?? ""), inputType: "text" },
        { field: "amount", label: "Amount (₱)", value: String(p.amount ?? 0), inputType: "number" },
        { field: "frequency", label: "Frequency", value: String(p.frequency ?? "MONTHLY"), inputType: "freq-select" },
        { field: "categoryName", label: "Category", value: String(p.categoryName ?? ""), inputType: "select" },
      ];
    case "create_expense":
      return [
        { field: "amount", label: "Amount (₱)", value: String(p.amount ?? 0), inputType: "number" },
        { field: "description", label: "Description", value: String(p.description ?? ""), inputType: "text" },
        { field: "category", label: "Category", value: String(p.category ?? ""), inputType: "select" },
        ...(p.date ? [{ field: "date", label: "Date", value: String(p.date), inputType: "date" as const }] : []),
      ];
    case "update_budget":
      return [
        { field: "categoryName", label: "Category", value: String(p.categoryName ?? ""), inputType: "text" },
        { field: "month", label: "Month", value: String(p.month ?? new Date().toISOString().slice(0, 7)), inputType: "month" },
        { field: "amountLimit", label: "New Amount (₱)", value: String(p.amountLimit ?? 0), inputType: "number" },
      ];
    case "create_category":
      return [
        { field: "name", label: "Name", value: String(p.name ?? ""), inputType: "text" },
        ...(p.icon !== undefined ? [{ field: "icon", label: "Icon", value: String(p.icon ?? ""), inputType: "text" as const }] : []),
      ];
    case "rename_category":
      return [
        { field: "currentName", label: "Current Name", value: String(p.currentName ?? ""), inputType: "text" },
        { field: "newName", label: "New Name", value: String(p.newName ?? ""), inputType: "text" },
      ];
    case "delete_category":
      return [
        { field: "name", label: "Category Name", value: String(p.name ?? ""), inputType: "text" },
      ];
    case "update_goal":
      return [
        ...(p.name !== undefined ? [{ field: "name", label: "Goal Name", value: String(p.name ?? ""), inputType: "text" as const }] : []),
        ...(p.targetAmount !== undefined ? [{ field: "targetAmount", label: "Target Amount (₱)", value: String(p.targetAmount ?? 0), inputType: "number" as const }] : []),
        ...(p.savedAmount !== undefined ? [{ field: "savedAmount", label: "Saved Amount (₱)", value: String(p.savedAmount ?? 0), inputType: "number" as const }] : []),
        ...(p.targetDate !== undefined ? [{ field: "targetDate", label: "Target Date", value: String(p.targetDate ?? ""), inputType: "date" as const }] : []),
        ...(p.paused !== undefined ? [{ field: "paused", label: "Paused", value: String(p.paused ?? false), inputType: "text" as const }] : []),
      ];
    case "update_recurring":
      return [
        ...(p.name !== undefined ? [{ field: "name", label: "Name", value: String(p.name ?? ""), inputType: "text" as const }] : []),
        ...(p.amount !== undefined ? [{ field: "amount", label: "Amount (₱)", value: String(p.amount ?? 0), inputType: "number" as const }] : []),
        ...(p.frequency !== undefined ? [{ field: "frequency", label: "Frequency", value: String(p.frequency ?? "MONTHLY"), inputType: "freq-select" as const }] : []),
        ...(p.dayOfMonth !== undefined ? [{ field: "dayOfMonth", label: "Day of Month", value: String(p.dayOfMonth ?? ""), inputType: "number" as const }] : []),
        ...(p.dayOfWeek !== undefined ? [{ field: "dayOfWeek", label: "Day of Week", value: String(p.dayOfWeek ?? ""), inputType: "number" as const }] : []),
        ...(p.active !== undefined ? [{ field: "active", label: "Active", value: String(p.active ?? true), inputType: "text" as const }] : []),
      ];
    case "update_profile":
      return [
        ...(p.name !== undefined ? [{ field: "name", label: "Display Name", value: String(p.name ?? ""), inputType: "text" as const }] : []),
        ...(p.nickname !== undefined ? [{ field: "nickname", label: "Nickname", value: String(p.nickname ?? ""), inputType: "text" as const }] : []),
        ...(p.avatar !== undefined ? [{ field: "avatar", label: "Avatar Color", value: String(p.avatar ?? ""), inputType: "text" as const }] : []),
        ...(p.defaultCategory !== undefined ? [{ field: "defaultCategory", label: "Default Category", value: String(p.defaultCategory ?? ""), inputType: "select" as const }] : []),
      ];
    case "delete_expenses":
      return [
        { field: "category", label: "Category", value: String(p.category ?? ""), inputType: "select" },
        ...(p.from !== undefined ? [{ field: "from", label: "From Date", value: String(p.from ?? ""), inputType: "date" as const }] : []),
        ...(p.to !== undefined ? [{ field: "to", label: "To Date", value: String(p.to ?? ""), inputType: "date" as const }] : []),
      ];
    case "recategorize_expenses":
      return [
        { field: "fromCategory", label: "From Category", value: String(p.fromCategory ?? ""), inputType: "select" },
        { field: "toCategory", label: "To Category", value: String(p.toCategory ?? ""), inputType: "select" },
      ];
    default:
      return [];
  }
}

/**
 * One assistant turn from `POST /ai/chat/confirm`.
 *
 * The contract types `type` as a bare string, so the domain is added here the same way
 * `src/api/ai.ts` adds it to a chat turn. Unlike the rest of this client, the payload inside
 * `result` is the v1 shape — see `confirmChatAction` for why — so the aliases in `ai.ts`, which
 * all point at the centavos members, do not describe it and are deliberately not reused.
 */
export type ChatConfirmResponse = Omit<Schemas["ChatResponse"], "type"> & {
  type: ChatResponseType;
};

/**
 * Execute the action the server proposed on a `preview` turn, by handing its `toolName` and
 * `params` straight back. No sentence is rebuilt, so nothing is re-parsed and the action that
 * runs is the one the card showed.
 *
 * Two things about this call are not like the other 19 modules in `src/api/`:
 *
 * - **It is posted to the unversioned surface.** The contract publishes `/ai/chat/confirm` only
 *   there — `/api/v2` has no twin — which is on purpose: a preview's `params` are the v1 decimal
 *   arguments, and converting them to centavos on the way back would confirm the amount a
 *   hundredfold. They are echoed unchanged, and no money is parsed here.
 * - **Its `result` carries decimal money.** It is the v1 `ChatResponse`. Every tool reachable
 *   through a preview is a write, and a write's result is rendered as prose plus an id — no
 *   amount from it reaches a formatter. A read tool's money-bearing payload still arrives over
 *   `/api/v2/ai/chat` as centavos.
 */
export async function confirmChatAction(
  toolName: string,
  params: Record<string, unknown>,
  conversationId?: number,
): Promise<ChatConfirmResponse> {
  const body: Schemas["ChatConfirmRequest"] = { toolName, params, mode: "execute", conversationId };
  const res = await api.post<ChatConfirmResponse>("/ai/chat/confirm", body, {
    baseURL: UNVERSIONED_BASE_URL,
  });
  return res.data;
}

export function dispatchDataEvents(toolName: string) {
  window.dispatchEvent(new CustomEvent("gastosai:expense-changed"));
  if (toolName.includes("budget")) window.dispatchEvent(new CustomEvent("gastosai:budget-changed"));
  if (toolName.includes("goal")) window.dispatchEvent(new CustomEvent("gastosai:goal-changed"));
  if (toolName.includes("recurring")) window.dispatchEvent(new CustomEvent("gastosai:recurring-changed"));
  if (toolName.includes("category")) window.dispatchEvent(new CustomEvent("gastosai:category-changed"));
  if (toolName.includes("profile") || toolName === "set_default_category") window.dispatchEvent(new CustomEvent("gastosai:profile-changed"));
  if (toolName.includes("alert") || toolName === "mark_alert_read" || toolName === "dismiss_alert" || toolName === "delete_alert") {
    window.dispatchEvent(new CustomEvent("gastosai:alert-changed"));
  }
  if (toolName === "set_category_icon") window.dispatchEvent(new CustomEvent("gastosai:category-changed"));
  if (toolName === "delete_expenses" || toolName === "recategorize_expenses") {
    window.dispatchEvent(new CustomEvent("gastosai:expense-changed"));
  }
}

/**
 * Fire every data-changed event. Used when a chat action executed directly (not via the
 * preview/confirm flow) so we don't know the exact tool name — over-refreshing mounted
 * pages is harmless and guarantees the UI reflects the change.
 */
export function dispatchAllDataEvents() {
  for (const e of ["expense", "budget", "goal", "recurring", "category", "profile", "alert"]) {
    window.dispatchEvent(new CustomEvent(`gastosai:${e}-changed`));
  }
}
