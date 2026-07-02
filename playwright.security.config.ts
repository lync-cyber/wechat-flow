import { defineConfig, devices } from "@playwright/test";

const EDITOR_URL = "http://localhost:5173";

// security project：真实浏览器验证需要真实用户输入路径（键入/点击）的安全断言，
// 与 T-058 视觉基线（page.setContent 自一致性）及 design-overlay（截图）分离。
export default defineConfig({
  testDir: "e2e/visual",
  testMatch: "preview-sandbox-security.spec.ts",
  projects: [
    {
      name: "security",
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
