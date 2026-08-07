/**
 * The subset of the DOM `Storage` API this app actually uses.
 *
 * Helpers take one of these as a dependency instead of reaching for the
 * ambient `localStorage` global: Node 26 ships an experimental `localStorage`
 * that displaces the jsdom one and is absent unless `--localstorage-file` is
 * passed, so the global is not something a module can assume exists.
 */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * The browser's `localStorage`, or `null` where it is missing or unusable
 * (Node without the experimental flag, Safari private mode, storage disabled).
 * Resolved per call — never captured at module load, so a test that installs a
 * stub after import still gets it.
 */
export function getLocalStorage(): KeyValueStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
