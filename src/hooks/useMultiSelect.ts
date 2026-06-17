import { useCallback, useMemo, useState } from "react";

/**
 * Generic multi-select state for list/grid rows keyed by numeric id.
 * Mirrors the selection UX on the Expenses screen, reused across
 * Budgets / Recurring / Goals / Categories.
 */
export function useMultiSelect(allIds: number[]) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const isAll = allIds.length > 0 && allIds.every((id) => prev.has(id));
      return isAll ? new Set() : new Set(allIds);
    });
  }, [allIds]);

  const selectedIds = useMemo(() => [...selected], [selected]);

  return { selected, selectedIds, count: selected.size, toggle, toggleAll, clear, allSelected };
}
