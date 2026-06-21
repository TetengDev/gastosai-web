import { useCallback, useEffect, useRef, useState } from "react";
import {
  createExpense,
  deleteAllExpenses,
  deleteExpense,
  getExpensesPage,
  updateExpense,
} from "../api/expenses";
import type { Expense, ExpenseRequest } from "../api/types";

const PAGE_SIZE = 50;

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  // Next page index to fetch; held in a ref so loadMore stays stable and avoids races.
  const nextPage = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExpensesPage({ page: 0, size: PAGE_SIZE });
      setExpenses(data.content);
      setTotal(data.totalElements);
      setHasMore(!data.last);
      nextPage.current = 1;
    } catch {
      setError("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await getExpensesPage({ page: nextPage.current, size: PAGE_SIZE });
      setExpenses((prev) => [...prev, ...data.content]);
      setTotal(data.totalElements);
      setHasMore(!data.last);
      nextPage.current += 1;
    } catch {
      // keep what's loaded; user can retry
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore]);

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
    setTotal((t) => t + 1);
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
    setTotal((t) => Math.max(0, t - 1));
    dispatch();
  };

  const removeAll = async (): Promise<void> => {
    await deleteAllExpenses();
    setExpenses([]);
    setTotal(0);
    setHasMore(false);
    nextPage.current = 0;
    dispatch();
  };

  return { expenses, loading, loadingMore, error, total, hasMore, refresh: load, loadMore, add, update, remove, removeAll };
}
