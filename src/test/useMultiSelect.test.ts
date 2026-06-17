import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMultiSelect } from "../hooks/useMultiSelect";

describe("useMultiSelect", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useMultiSelect([1, 2, 3]));
    expect(result.current.count).toBe(0);
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.allSelected).toBe(false);
  });

  it("toggles a single id on and off", () => {
    const { result } = renderHook(() => useMultiSelect([1, 2, 3]));
    act(() => result.current.toggle(2));
    expect(result.current.selected.has(2)).toBe(true);
    expect(result.current.count).toBe(1);
    act(() => result.current.toggle(2));
    expect(result.current.selected.has(2)).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it("toggleAll selects every id, then clears when all selected", () => {
    const { result } = renderHook(() => useMultiSelect([1, 2, 3]));
    act(() => result.current.toggleAll());
    expect(result.current.count).toBe(3);
    expect(result.current.allSelected).toBe(true);
    act(() => result.current.toggleAll());
    expect(result.current.count).toBe(0);
    expect(result.current.allSelected).toBe(false);
  });

  it("toggleAll on an empty list is a no-op and allSelected stays false", () => {
    const { result } = renderHook(() => useMultiSelect([]));
    act(() => result.current.toggleAll());
    expect(result.current.count).toBe(0);
    expect(result.current.allSelected).toBe(false);
  });

  it("clear empties the selection", () => {
    const { result } = renderHook(() => useMultiSelect([1, 2]));
    act(() => result.current.toggle(1));
    act(() => result.current.clear());
    expect(result.current.count).toBe(0);
  });

  it("replace sets the selection to exactly the given ids", () => {
    const { result } = renderHook(() => useMultiSelect([1, 2, 3]));
    act(() => result.current.toggleAll());
    act(() => result.current.replace([2]));
    expect(result.current.selectedIds).toEqual([2]);
    expect(result.current.count).toBe(1);
    expect(result.current.allSelected).toBe(false);
  });
});
