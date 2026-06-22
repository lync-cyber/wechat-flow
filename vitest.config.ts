import vue from "@vitejs/plugin-vue";
import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  test: {
    include: ["packages/*/src/**/*.test.ts", "apps/*/src/**/*.test.ts", "tests/**/*.test.ts"],
    environmentMatchGlobs: [["apps/editor/**", "happy-dom"]],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["packages/*/src/**", "apps/*/src/**"],
      exclude: [
        ...coverageConfigDefaults.exclude,
        "**/*.test.ts",
        "**/__tests__/**",
        "**/index.ts",
        "**/*.d.ts",
        "**/types.ts",
        "apps/*/src/main.ts",
        "apps/editor/src/router/**",
        "apps/editor/src/pages/**",
        "scripts/**",
        "**/*.mjs",
      ],
      thresholds: {
        lines: 95,
        functions: 90,
        branches: 90,
        statements: 95,
      },
    },
  },
});
