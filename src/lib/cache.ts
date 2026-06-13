import type { Category } from "../api/types";

interface RateCacheEntry { rate: number; ts: number; }
export const rateCache: Record<string, RateCacheEntry> = {};
export const RATE_TTL_MS = 60 * 60 * 1000;

interface CategoryCacheEntry { data: Category[]; ts: number; }
let _categoryCache: CategoryCacheEntry | null = null;
export const CAT_TTL_MS = 5 * 60 * 1000;

export function getCategoryCache(): CategoryCacheEntry | null { return _categoryCache; }
export function setCategoryCache(data: Category[]) { _categoryCache = { data, ts: Date.now() }; }
export function invalidateCategoryCache() { _categoryCache = null; }
