/**
 * An in-memory implementation of the DOM `Storage` interface, used to give the
 * suite a storage it owns instead of whichever `localStorage` the host happens
 * to expose. Node 26 ships an experimental `localStorage` global that displaces
 * the jsdom one and is inert (in fact absent) without `--localstorage-file`, so
 * the ambient global is not the same object from one Node version to the next.
 */
export function createMemoryStorage(): Storage {
  const entries = new Map<string, string>();

  return {
    get length() {
      return entries.size;
    },
    key(index: number): string | null {
      return [...entries.keys()][index] ?? null;
    },
    getItem(key: string): string | null {
      return entries.get(String(key)) ?? null;
    },
    setItem(key: string, value: string): void {
      entries.set(String(key), String(value));
    },
    removeItem(key: string): void {
      entries.delete(String(key));
    },
    clear(): void {
      entries.clear();
    },
  };
}
