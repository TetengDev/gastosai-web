import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "../test/memoryStorage";
import type { KeyValueStorage } from "./storage";
import {
  COLOR_SCHEME_KEY,
  clearLegacyTheme,
  readOverride,
  resolveScheme,
  toggleColorScheme,
} from "./colorScheme";

const LIGHT_OS = false;
const DARK_OS = true;

describe("toggleColorScheme — the dark-mode-toggle guide's example scenario", () => {
  it("1. OS light, nothing stored: toggling pins dark, because dark differs from the OS", () => {
    const storage = createMemoryStorage();
    const next = toggleColorScheme(null, LIGHT_OS, storage);
    expect(next).toBe("dark");
    expect(storage.getItem(COLOR_SCHEME_KEY)).toBe("dark");
    expect(resolveScheme(next, LIGHT_OS)).toBe("dark");
  });

  it("2. the OS then switches to dark: the stored dark is kept, though it now matches", () => {
    const storage = createMemoryStorage();
    storage.setItem(COLOR_SCHEME_KEY, "dark");
    const override = readOverride(storage);
    expect(resolveScheme(override, DARK_OS)).toBe("dark");
    expect(storage.getItem(COLOR_SCHEME_KEY)).toBe("dark");
  });

  it("3. the OS switches back to light: the page stays dark", () => {
    const storage = createMemoryStorage();
    storage.setItem(COLOR_SCHEME_KEY, "dark");
    expect(resolveScheme(readOverride(storage), LIGHT_OS)).toBe("dark");
  });

  it("4. toggling to light, which matches the OS, removes the stored value", () => {
    const storage = createMemoryStorage();
    storage.setItem(COLOR_SCHEME_KEY, "dark");
    const next = toggleColorScheme("dark", LIGHT_OS, storage);
    expect(next).toBeNull();
    expect(storage.getItem(COLOR_SCHEME_KEY)).toBeNull();
    expect(resolveScheme(next, LIGHT_OS)).toBe("light");
  });
});

describe("toggleColorScheme — the target is the opposite of what is on screen", () => {
  it("OS dark, nothing stored: toggling pins light", () => {
    const storage = createMemoryStorage();
    expect(toggleColorScheme(null, DARK_OS, storage)).toBe("light");
    expect(storage.getItem(COLOR_SCHEME_KEY)).toBe("light");
  });

  it("a dark pin on a dark OS toggles to light, which differs from the OS, so light is stored", () => {
    const storage = createMemoryStorage();
    storage.setItem(COLOR_SCHEME_KEY, "dark");
    expect(toggleColorScheme("dark", DARK_OS, storage)).toBe("light");
    expect(storage.getItem(COLOR_SCHEME_KEY)).toBe("light");
  });

  it("toggling twice from nothing leaves storage empty", () => {
    const storage = createMemoryStorage();
    const once = toggleColorScheme(null, DARK_OS, storage);
    const twice = toggleColorScheme(once, DARK_OS, storage);
    expect(twice).toBeNull();
    expect(storage.length).toBe(0);
  });

  it("still returns the new scheme when storage is missing or throws, so the page can apply it", () => {
    const throwing: KeyValueStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(toggleColorScheme(null, LIGHT_OS, throwing)).toBe("dark");
    expect(toggleColorScheme("dark", LIGHT_OS, throwing)).toBeNull();
    expect(toggleColorScheme(null, LIGHT_OS, null)).toBe("dark");
  });
});

describe("readOverride", () => {
  it("reads only light or dark; anything else means follow the OS", () => {
    const storage = createMemoryStorage();
    expect(readOverride(storage)).toBeNull();
    storage.setItem(COLOR_SCHEME_KEY, "light");
    expect(readOverride(storage)).toBe("light");
    storage.setItem(COLOR_SCHEME_KEY, "light dark");
    expect(readOverride(storage)).toBeNull();
    expect(readOverride(null)).toBeNull();
  });
});

describe("clearLegacyTheme", () => {
  it("removes the old always-written theme key without migrating it", () => {
    const storage = createMemoryStorage();
    storage.setItem("theme", "dark");
    clearLegacyTheme(storage);
    expect(storage.getItem("theme")).toBeNull();
    expect(storage.getItem(COLOR_SCHEME_KEY)).toBeNull();
  });

  it("tolerates missing storage", () => {
    expect(() => clearLegacyTheme(null)).not.toThrow();
  });
});
