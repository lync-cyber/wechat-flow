import { defineConfig, devices } from "@playwright/test";

// 非默认端口 + strictPort：避免 reuseExistingServer 误连本机其他项目的 vite dev server。
const EDITOR_URL = "http://localhost:5273";

// sandbox-security project 与视觉基线（playwright.config.ts 的 chromium project）分离：
// 后者用 page.setContent 渲染内容自一致性，本 project 需要真实编辑器 SPA 验证
// iframe sandbox + CSP 对注入脚本的运行时阻断，依赖 vite dev server。
export default defineConfig({
  testDir: "e2e/visual",
  projects: [
    {
      name: "sandbox-security",
      testMatch: "preview-sandbox-security.spec.ts",
      use: { ...devices["Desktop Chrome"], baseURL: EDITOR_URL },
    },
  ],
  webServer: {
    command: "pnpm --filter @wechat-flow/editor dev --port 5273 --strictPort",
    url: EDITOR_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
