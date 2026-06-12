import { useCallback, useEffect, useState } from "react";
import {
  createExpense,
  deleteAllExpenses,
  deleteExpense,
  getExpenses,
  updateExpense,
} from "../api/expenses";
import type { Expense, ExpenseRequest } from "../api/types";

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch {
      setError("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    window.addEventListener("gastosai:expense-changed", load);
    return () => window.removeEventListener("gastosai:expense-changed", load);
  }, [load]);

  const dispatch = () => window.dispatchEvent(new CustomEvent("gastosai:expense-changed"));

  const add = async (req: ExpenseRequest): Promise<Expense> => {
    const created = await createExpense(req);
    setExpenses((prev) => [created, ...prev]);
    dispatch();
    return created;
  };

  const update = async (id: number, req: ExpenseRequest): Promise<Expense> => {
    const updated = await updateExpense(id, req);
    setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
    dispatch();
    return updated;
  };

  const remove = async (id: number): Promise<void> => {
    await deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    dispatch();
  };

  const removeAll = async (): Promise<void> => {
    await deleteAllExpenses();
    setExpenses([]);
    dispatch();
  };

  return { expenses, loading, error, refresh: load, add, update, remove, removeAll };
}