// Pure helpers for chatbot CRUD action cards (labels, editable field specs, confirm-message
// builder, and the data-change event dispatcher). Extracted from ChatWidget; no UI or state here.

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
    case "create_category":
      return `create category ${params.name}${params.icon ? ` icon ${params.icon}` : ""}`;
    case "rename_category":
      return `rename category ${params.currentName} to ${params.newName}`;
    case "delete_category":
      return `delete category ${params.name}`;
    case "update_goal":
      return `update goal${params.id ? ` id ${params.id}` : params.name ? ` ${params.name}` : ""}${params.targetAmount !== undefined ? ` target ₱${params.targetAmount}` : ""}${params.savedAmount !== undefined ? ` saved ₱${params.savedAmount}` : ""}${params.paused !== undefined ? ` paused ${params.paused}` : ""}`;
    case "update_recurring":
      return `update recurring${params.id ? ` id ${params.id}` : params.name ? ` ${params.name}` : ""}${params.amount !== undefined ? ` ₱${params.amount}` : ""}${params.frequency !== undefined ? ` ${params.frequency}` : ""}${params.active !== undefined ? ` active ${params.active}` : ""}`;
    case "update_profile":
      return `update profile${params.name ? ` name ${params.name}` : ""}${params.nickname ? ` nickname ${params.nickname}` : ""}${params.avatar ? ` avatar ${params.avatar}` : ""}`;
    default:
      return "";
  }
}

export function dispatchDataEvents(toolName: string) {
  window.dispatchEvent(new CustomEvent("gastosai:expense-changed"));
  if (toolName.includes("budget")) window.dispatchEvent(new CustomEvent("gastosai:budget-changed"));
  if (toolName.includes("goal")) window.dispatchEvent(new CustomEvent("gastosai:goal-changed"));
  if (toolName.includes("recurring")) window.dispatchEvent(new CustomEvent("gastosai:recurring-changed"));
  if (toolName.includes("category")) window.dispatchEvent(new CustomEvent("gastosai:category-changed"));
  if (toolName.includes("profile")) window.dispatchEvent(new CustomEvent("gastosai:profile-changed"));
}
