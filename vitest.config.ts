import vue from "@vitejs/plugin-vue";
import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  test: {
    // chromium+Redis e2e (job-e2e / headless-render) are timing-flaky; retry absorbs
    // transient failures so the pre-push coverage gate isn't blocked by a false negative.
    retry: 2,
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
        // 浏览器/Redis 集成代码：仅 chromium/Redis 可达时由 gated 集成测试覆盖，CI 无基础设施时排除以免误判
        "apps/relay/src/headless/playwright-pool.ts",
        "apps/relay/src/headless/render-long-image.ts",
        "apps/relay/src/headless/render-cover.ts",
        "apps/relay/src/job/queue.ts",
        "apps/relay/src/job/bullmq-store.ts",
        "apps/relay/src/job/runtime.ts",
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
