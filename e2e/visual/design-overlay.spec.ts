import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { type Page, expect, test } from "@playwright/test";

const OUT = fileURLToPath(new URL("./design-overlay-output", import.meta.url));

interface PageTarget {
  id: string;
  route: string;
  viewport?: { width: number; height: number };
  tab?: string;
}

const PAGES: PageTarget[] = [
  { id: "P-001", route: "/" },
  { id: "P-002", route: "/", tab: "文档" },
  { id: "P-003", route: "/themes" },
  { id: "P-004", route: "/settings" },
  { id: "P-005", route: "/preview/demo", viewport: { width: 375, height: 812 } },
];

// 静态组件：selector 映射到实现的真实标识，多实例组件截第一个实例。
// UC-007/UC-022 的宿主给实例传动态 data-testid（fallthrough 覆盖根静态值），用前缀匹配。
interface StaticTarget {
  id: string;
  route: string;
  selector: string;
  prepare?: (page: Page) => Promise<void>;
}

const STATIC_COMPONENTS: StaticTarget[] = [
  { id: "UC-001", route: "/", selector: '[data-testid="top-bar"]' },
  { id: "UC-002", route: "/", selector: '[data-testid="left-splitter"]' },
  { id: "UC-003", route: "/", selector: '[data-testid="top-bar-toolbar"]' },
  { id: "UC-004", route: "/", selector: '[data-testid="source-pane"]' },
  { id: "UC-005", route: "/", selector: '[data-testid="preview-pane"]' },
  { id: "UC-006", route: "/", selector: '[data-testid="left-panel"]' },
  { id: "UC-007", route: "/", selector: '[data-testid^="theme-card-"]' },
  {
    id: "UC-008",
    route: "/",
    selector: '[data-testid="block-lib-item"]',
    prepare: async (page) => {
      await page.getByTestId("tab-components").click();
    },
  },
  { id: "UC-022", route: "/themes", selector: '[data-testid^="template-theme-card-"]' },
  { id: "UC-023", route: "/", selector: '[data-testid="status-bar-root"]' },
];

async function gotoEditor(page: Page): Promise<void> {
  await page.goto("/");
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  await expect(page.getByTestId("source-pane")).toBeVisible();
}

async function openMoreMenu(page: Page): Promise<void> {
  await page.getByTestId("top-bar-more-btn").click();
  await expect(page.getByTestId("context-menu")).toBeVisible();
}

async function typeInEditor(page: Page, text: string): Promise<void> {
  const editor = page.locator('[data-testid="source-pane-editor"] .cm-content');
  await editor.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Delete");
  await page.keyboard.type(text, { delay: 5 });
}

// 交互触发组件：先执行触发交互，组件可见后截组件本体。
interface InteractiveTarget {
  id: string;
  selector: string;
  trigger: (page: Page) => Promise<void>;
}

const INTERACTIVE_COMPONENTS: InteractiveTarget[] = [
  {
    id: "UC-009",
    selector: '[data-testid="command-palette"]',
    trigger: async (page) => {
      await page.keyboard.press("Control+k");
    },
  },
  {
    // DropdownMenu 在实现中的唯一实例是 ContextMenu（fallthrough testid=context-menu）
    id: "UC-010",
    selector: '[data-testid="context-menu"]',
    trigger: openMoreMenu,
  },
  {
    // toast testid 按类型后缀（toast-success/-error），前缀匹配
    id: "UC-011",
    selector: '[data-testid^="toast-"]',
    trigger: async (page) => {
      await page.getByRole("button", { name: "复制到公众号" }).click();
    },
  },
  {
    // 快捷键手册是 BaseModal confirm 实例；截 base-modal 面板含标题与 footer
    id: "UC-012",
    selector: '[data-testid="base-modal"]',
    trigger: async (page) => {
      await openMoreMenu(page);
      await page.getByTestId("menu-item-help-shortcuts").click();
      await expect(page.getByTestId("shortcuts-modal")).toBeVisible();
    },
  },
  {
    // 设计帧为展开态且带诊断条目。空列表零高度会被判 hidden，需真实条目撑开：
    // 违禁词文本 + 「检测违规词」命令（该命令强制展开面板）。
    id: "UC-013",
    selector: '[data-testid="diagnostics-panel"]',
    trigger: async (page) => {
      await typeInEditor(page, "全网最低价，国家级第一品牌，绝对正品。");
      // 等防抖渲染管线落地（预览出现文本 = store.content 已更新），lint 才不会跑在空内容上
      const preview = page.frameLocator('[data-testid="preview-iframe"]');
      await expect(preview.locator("body")).toContainText("国家级", { timeout: 10000 });
      await openMoreMenu(page);
      await page.getByTestId("menu-item-content-keyword-lint").click();
      await expect(page.getByTestId("context-menu")).toBeHidden();
      await expect(page.getByTestId("diagnostics-list")).toBeVisible({ timeout: 10000 });
    },
  },
  {
    // 设计帧为整个导出面板卡片（标题 + 进度条 + 文案），截 panel 而非裸进度条
    id: "UC-014",
    selector: '[data-testid="export-job-panel"]',
    trigger: async (page) => {
      await page.keyboard.press("Control+k");
      await page.locator('[data-testid="command-palette"] input').fill("导出长图");
      await page.keyboard.press("Enter");
    },
  },
  {
    id: "UC-015",
    selector: '[data-testid="insert-drawer"]',
    trigger: async (page) => {
      await page.getByTestId("top-bar-insert-btn").click();
    },
  },
  {
    id: "UC-016",
    selector: '[data-testid="context-menu"]',
    trigger: openMoreMenu,
  },
  {
    // testid 在全屏 backdrop 上；设计帧为 modal panel 本体，截内层 panel
    id: "UC-017",
    selector: '[data-testid="zh-typo-preview-modal"] .zh-typo-modal__panel',
    trigger: async (page) => {
      await typeInEditor(page, "中文English混排,标点.");
      await openMoreMenu(page);
      await page.getByTestId("menu-item-content-zh-typo").click();
    },
  },
  {
    // SourcePane @dragenter 且 dataTransfer.types 含 Files 时显示 overlay
    id: "UC-018",
    selector: '[data-testid="image-upload-overlay"]',
    trigger: async (page) => {
      const dataTransfer = await page.evaluateHandle(() => {
        const dt = new DataTransfer();
        dt.items.add(new File([new Uint8Array(8)], "probe.png", { type: "image/png" }));
        return dt;
      });
      await page.dispatchEvent('[data-testid="source-pane"]', "dragenter", { dataTransfer });
    },
  },
  {
    id: "UC-019",
    selector: '[data-testid="paint-drawer"]',
    trigger: async (page) => {
      await openMoreMenu(page);
      await page.getByTestId("menu-item-settings-paint").click();
    },
  },
  {
    // 设计帧为 editing 态：填主色等 300ms 防抖派生矩阵渲染出色块后截面板
    id: "UC-020",
    selector: '[data-testid="base-modal"]',
    trigger: async (page) => {
      await page.getByTestId("link-palette-derive").click();
      await expect(page.getByTestId("base-color-derive-modal")).toBeVisible();
      await page.getByTestId("derive-hex-input").fill("#2d5a4e");
      // derive-token- 前缀会误匹配常驻的 derive-token-matrix 容器；分组容器仅派生后渲染
      await expect(page.locator('[data-testid^="derive-group-"]').first()).toBeVisible({
        timeout: 5000,
      });
    },
  },
  {
    id: "UC-021",
    selector: '[data-testid="directive-autocomplete-popover"]',
    trigger: async (page) => {
      await typeInEditor(page, ":::");
    },
  },
];

test.describe("design-overlay: 前端 SPA 截图", () => {
  test.beforeAll(() => {
    mkdirSync(`${OUT}/components`, { recursive: true });
    mkdirSync(`${OUT}/pages`, { recursive: true });
  });

  for (const p of PAGES) {
    test(`page ${p.id}`, async ({ page }) => {
      if (p.viewport) await page.setViewportSize(p.viewport);
      await page.goto(p.route);
      await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
      if (p.tab)
        await page
          .getByRole("tab", { name: p.tab })
          .click()
          .catch(() => {});
      const buf = await page.screenshot({ path: `${OUT}/pages/${p.id}.png`, fullPage: true });
      expect(buf.byteLength).toBeGreaterThan(0);
    });
  }

  for (const c of STATIC_COMPONENTS) {
    test(`component ${c.id}`, async ({ page }) => {
      await page.goto(c.route);
      await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
      await c.prepare?.(page);
      const el = page.locator(c.selector).first();
      await expect(el).toBeVisible({ timeout: 10000 });
      const buf = await el.screenshot({ path: `${OUT}/components/${c.id}.png` });
      expect(buf.byteLength).toBeGreaterThan(0);
    });
  }

  for (const c of INTERACTIVE_COMPONENTS) {
    test(`component ${c.id} (interactive)`, async ({ page }) => {
      await gotoEditor(page);
      await c.trigger(page);
      const el = page.locator(c.selector).first();
      await expect(el).toBeVisible({ timeout: 10000 });
      const buf = await el.screenshot({ path: `${OUT}/components/${c.id}.png` });
      expect(buf.byteLength).toBeGreaterThan(0);
    });
  }
});
