import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

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

// UC 组件多为编辑器内嵌子组件，无独立路由：优先按 data-testid 截元素，缺失时退化为宿主页面整页
// （ui-spec [ASSUMPTION] 允许的页面裁剪来源）。UC-022 位于主题市场，其余以编辑器主页为宿主。
interface ComponentTarget {
  id: string;
  route: string;
  testid: string;
}

const COMPONENTS: ComponentTarget[] = Array.from({ length: 23 }, (_, i) => {
  const id = `UC-${String(i + 1).padStart(3, "0")}`;
  return { id, route: id === "UC-022" ? "/themes" : "/", testid: id };
});

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

  for (const c of COMPONENTS) {
    test(`component ${c.id}`, async ({ page }) => {
      await page.goto(c.route);
      await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
      const el = page.locator(`[data-testid="${c.testid}"]`).first();
      const useEl = (await el.count()) > 0;
      const buf = useEl
        ? await el.screenshot({ path: `${OUT}/components/${c.id}.png` })
        : await page.screenshot({ path: `${OUT}/components/${c.id}.png`, fullPage: true });
      expect(buf.byteLength).toBeGreaterThan(0);
    });
  }
});
