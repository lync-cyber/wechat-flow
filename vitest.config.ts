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
        autoUpdate: true,
        lines: 96.45,
        functions: 87.68,
        branches: 89.7,
        statements: 96.45,
      },
    },
  },
});
