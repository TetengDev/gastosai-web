import { afterEach, describe, expect, it } from "vitest";
import { getLocalStorage } from "../lib/storage";
import { createMemoryStorage } from "./memoryStorage";

/**
 * The two failure branches of `getLocalStorage` are the whole point of the
 * module, and neither occurs naturally in the suite: `setup.ts` installs a
 * working storage, so without these tests the function only ever takes its
 * happy path. Each test redefines the global and hands it back afterwards.
 */
describe("getLocalStorage", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

  afterEach(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
  });

  function installGlobal(descriptor: PropertyDescriptor): void {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, ...descriptor });
  }

  it("returns the storage the host exposes", () => {
    const storage = createMemoryStorage();
    installGlobal({ value: storage, writable: true });

    expect(getLocalStorage()).toBe(storage);
  });

  it("returns null when the global is absent — Node without --localstorage-file", () => {
    installGlobal({ value: undefined, writable: true });

    expect(getLocalStorage()).toBeNull();
  });

  it("returns null when reading the global throws — storage disabled", () => {
    installGlobal({
      get() {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    });

    expect(getLocalStorage()).toBeNull();
  });

  it("resolves per call, so a stub installed after import still wins", () => {
    const first = createMemoryStorage();
    const second = createMemoryStorage();

    installGlobal({ value: first, writable: true });
    expect(getLocalStorage()).toBe(first);

    installGlobal({ value: second, writable: true });
    expect(getLocalStorage()).toBe(second);
  });
});
