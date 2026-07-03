import { defineConfig, devices } from "@playwright/test";

// 非默认端口 + strictPort：避免 reuseExistingServer 误连本机其他项目的 vite dev server；
// 与 playwright.sandbox.config.ts（5273）错开，两 config 并行互不干扰。
const EDITOR_URL = "http://localhost:5274";

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
    command: "pnpm --filter @wechat-flow/editor dev --port 5274 --strictPort",
    url: EDITOR_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
