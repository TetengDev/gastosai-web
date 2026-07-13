/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8")) as {
  version: string;
};

export default defineConfig({
  // Env files live at the repo root (single .env for the whole stack).
  // Only VITE_*-prefixed vars are exposed to client code.
  envDir: "..",
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
    // Deterministic tests: don't let a developer's real root .env flip billing UI.
    env: {
      VITE_BILLING_ENABLED: "",
    },
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],

      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/main.tsx",
        "src/env.d.ts",
        "src/**/*.d.ts",
        "src/api/client.ts",
        "src/api/auth.ts",
        "src/api/expenses.ts",
        "src/api/categories.ts",
        "src/api/ai.ts",
        "src/api/features.ts",
        "src/api/profile.ts",
        "src/api/types.ts",
        "src/context/**",
        "src/pages/**",
        "src/components/**",
        "src/App.tsx",
        "src/hooks/**",
      ],
    },
  },
});
