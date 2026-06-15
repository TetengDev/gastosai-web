// Pure helpers for chatbot CRUD action cards (labels, editable field specs, confirm-message
// builder, and the data-change event dispatcher). Extracted from ChatWidget; no UI or state here.

export function actionLabel(toolName: string): string {
  const labels: Record<string, string> = {
    create_budget: "New budget",
    create_goal: "New savings goal",
    create_recurring: "New recurring expense",
    create_expense: "New expense",
    update_budget: "Update budget",
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
    default:
      return [];
  }
}

export function buildConfirmMessage(toolName: string, params: Record<string, unknown>): string {
  switch (toolName) {
    case "create_budget":
      return `create a budget for ${params.categoryName} ₱${params.amountLimit} month ${params.month}`;
    case "create_goal":
      return `create a goal called ${params.name} target ₱${params.targetAmount}${params.savedAmount ? ` saved ₱${params.savedAmount}` : ""}`;
    case "create_recurring":
      return `create recurring ${params.name} ₱${params.amount} ${params.frequency}${params.categoryName ? ` ${params.categoryName}` : ""}`;
    case "create_expense":
      return `₱${params.amount} ${params.description}${params.category ? ` ${params.category}` : ""}`;
    default:
      return "";
  }
}

export function dispatchDataEvents(toolName: string) {
  window.dispatchEvent(new CustomEvent("gastosai:expense-changed"));
  if (toolName.includes("budget")) window.dispatchEvent(new CustomEvent("gastosai:budget-changed"));
  if (toolName.includes("goal")) window.dispatchEvent(new CustomEvent("gastosai:goal-changed"));
  if (toolName.includes("recurring")) window.dispatchEvent(new CustomEvent("gastosai:recurring-changed"));
}
