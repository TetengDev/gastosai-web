import "@testing-library/jest-dom";
import { afterEach, beforeEach } from "vitest";
import { createMemoryStorage } from "./memoryStorage";

// Own the storage the suite runs against rather than inheriting whatever the
// host provides: jsdom supplies one on Node 20, Node 26's experimental global
// displaces it with one that is absent without `--localstorage-file`, and code
// under test that reads `localStorage` then throws for environment reasons.
const storage = createMemoryStorage();

for (const target of [globalThis, globalThis.window].filter(Boolean)) {
  Object.defineProperty(target, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
}

// A test that dismisses a tip or logs a user must not leak into the next one.
beforeEach(() => storage.clear());
afterEach(() => storage.clear());
