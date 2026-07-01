import { defineConfig, devices } from "@playwright/test";

const EDITOR_URL = "http://localhost:5173";

// design-overlay project 与 T-058 视觉基线（playwright.config.ts 的 chromium project）分离：
// 后者用 page.setContent 渲染内容自一致性，本 project 截取真实编辑器 SPA 路由与组件。
export default defineConfig({
  testDir: "e2e/visual",
  projects: [
    {
      name: "design-overlay",
      testMatch: "design-overlay.spec.ts",
      use: { ...devices["Desktop Chrome"], baseURL: EDITOR_URL },
    },
  ],
  webServer: {
    command: "pnpm --filter @wechat-flow/editor dev",
    url: EDITOR_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
