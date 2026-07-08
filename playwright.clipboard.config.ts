import { defineConfig, devices } from "@playwright/test";

// 非默认端口 + strictPort：避免 reuseExistingServer 误连本机其他项目的 vite dev server；
// 与 playwright.sandbox.config.ts（5273）/ playwright.design-overlay.config.ts（5274）错开。
const EDITOR_URL = "http://localhost:5275";

// clipboard project 验证真实系统剪贴板写入（Clipboard API），需要真实 Chromium 授予
// clipboard-read/clipboard-write 权限，happy-dom 单测无法模拟浏览器多 ClipboardItem
// 拒绝语义，必须由真实浏览器验证。
export default defineConfig({
  testDir: "e2e/visual",
  projects: [
    {
      name: "clipboard",
      testMatch: "clipboard-copy.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: EDITOR_URL,
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },
  ],
  webServer: {
    command: "pnpm --filter @wechat-flow/editor dev --port 5275 --strictPort",
    url: EDITOR_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
