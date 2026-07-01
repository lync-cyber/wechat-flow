import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    include: ["tests/cross-runtime/edge.test.ts"],
    poolOptions: {
      workers: {
        miniflare: {
          compatibilityDate: "2024-09-01",
          compatibilityFlags: ["nodejs_compat"],
        },
      },
    },
  },
});
