import { defineConfig, devices } from "@playwright/test";
import { DIFF_RATIO_THRESHOLD, PIXELMATCH_OPTIONS } from "./e2e/visual/pixelmatch-config.ts";

// Snapshots are isolated by OS to prevent cross-platform baseline conflicts.
// Local `pnpm test:visual:update` generates the local-platform baseline.
// CI runs inside the official Playwright Docker image (linux) for linux baselines.
export default defineConfig({
  testDir: "e2e/visual",
  snapshotPathTemplate: "{testDir}/snapshots/{platform}/{testFilePath}/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      threshold: PIXELMATCH_OPTIONS.threshold,
      maxDiffPixelRatio: DIFF_RATIO_THRESHOLD,
    },
  },
  projects: [
    {
      name: "chromium",
      testIgnore: "design-overlay.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
