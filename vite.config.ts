import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { configDefaults, defineConfig } from "vitest/config";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8")) as {
  version: string;
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    watch: {
      ignored: ["**/coverage/**"],
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    // Deterministic tests: don't let a developer's real .env flip billing UI.
    env: {
      VITE_BILLING_ENABLED: "",
    },
    setupFiles: ["./src/test/setup.ts"],
    // Playwright E2E specs live in e2e/ and must not be collected by Vitest.
    exclude: [...configDefaults.exclude, "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],

      include: ["src/**/*.{ts,tsx}"],
      // The denominator is pinned here on purpose: a coverage number is meaningless without
      // it, and the previous list excluded src/pages, src/components, src/hooks, src/context
      // and most of src/api — i.e. almost the whole application. See ../docs/coverage.md for
      // what is allowed off the list: generated output, entry points, type-only files and
      // components whose only job is to return markup with no conditional logic.
      exclude: [
        // Generated and type-only.
        "src/api/generated/**",
        "src/**/*.d.ts",
        // Entry point and route wiring.
        "src/main.tsx",
        "src/App.tsx",
        // Test files and their harness.
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        // Re-export barrel, no behaviour of its own.
        "src/components/ui/index.ts",
        // Pure presentational: markup only, no conditional logic. A file here that grows a
        // branch stops being presentational and belongs back in the denominator.
        "src/components/CategoryChip.tsx",
        "src/components/PublicLayout.tsx",
        "src/components/chat/ChatChrome.tsx",
        "src/components/ui/Button.tsx",
        "src/components/ui/IconButton.tsx",
        "src/pages/About.tsx",
        "src/pages/Contact.tsx",
        "src/pages/NotFound.tsx",
        "src/pages/Terms.tsx",
      ],
      // The ratchet (../docs/coverage.md): set from a measured run, rounded down to a whole
      // percent, and only ever allowed to rise. Lowering it is a review finding.
      // Measured 2026-09-17 against the include set above: 36.69% lines.
      thresholds: {
        lines: 36,
      },
    },
  },
});
