import { beforeEach, describe, expect, it } from "vitest";
import {
  registerTheme,
  renderMarkdown,
  resetBlockRegistry,
  resetThemeRegistry,
  resetVariantRegistry,
} from "../../../packages/core/src/index.ts";
import "../../../packages/blocks/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";

beforeEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
  resetThemeRegistry();
  registerTheme(defaultTheme);
});

const LEDGER_MD_WITH_TITLE =
  ':::compare{.ledger left-label="优点" left-value="速度快" right-label="缺点" right-value="成本高" title="方案对比"}\n:::';

const GOLDEN_LEDGER_HTML =
  '<section data-block="compare" data-variant="ledger" style="margin: 16px 0"><section style="color: #1c1917; font-size: 15px; font-weight: 600; line-height: 1.85; margin-bottom: 8px; text-align: center">方案对比</section><section style="color: #1c1917; display: table; font-size: 15px; line-height: 1.85; text-align: left; width: 100%"><section style="background: #f3f0eb; color: #1c1917; display: table-cell; font-size: 15px; line-height: 1.85; padding: 16px; text-align: left; width: 50%">优点：速度快</section><section style="background: #f0ede8; border-left: 1px solid #d6d3ce; color: #1c1917; display: table-cell; font-size: 15px; line-height: 1.85; padding: 16px; text-align: left; width: 50%">缺点：成本高</section></section></section>';

describe("T-190 AC-003 no-op 佐证: compare 块级 baseStyle 仅声明 root，slot merge 对现有产物无字节变化", () => {
  it("ledger 变体 title/table/left/right 四个 slot 渲染字节与 merge 改造前完全一致（block-directive 未涉及，独立断言）", async () => {
    const result = await renderMarkdown(LEDGER_MD_WITH_TITLE, { themeId: "default" });
    expect(result.html).toBe(GOLDEN_LEDGER_HTML);
  });
});
