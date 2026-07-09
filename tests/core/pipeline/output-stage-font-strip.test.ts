import { beforeAll, describe, expect, it } from "vitest";
import { registerTheme, renderMarkdown } from "../../../packages/core/src/index.ts";
import "../../../packages/blocks/src/index.ts";
import "../../../packages/marks/src/index.ts";
import businessTheme from "../../../packages/themes/business/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";
import literaryTheme from "../../../packages/themes/literary/src/index.ts";
import magazineTheme from "../../../packages/themes/magazine/src/index.ts";
import techTheme from "../../../packages/themes/tech/src/index.ts";

beforeAll(() => {
  registerTheme(defaultTheme);
  registerTheme(literaryTheme);
  registerTheme(techTheme);
  registerTheme(businessTheme);
  registerTheme(magazineTheme);
});

// T-183 AC-002: strip-font-family 迁 output 后剥除产物中全部生成 font-family 声明（决策①）。

describe("T-183 AC-002: renderMarkdown 产物不含任何 font-family 声明（决策①剥除）", () => {
  it("默认主题标题+段落渲染后 HTML 不含 font-family 声明", async () => {
    const result = await renderMarkdown("# 标题\n\n正文段落内容。", { themeId: "default" });

    expect(result.html).not.toMatch(/font-family\s*:/i);
  });
});

const ALL_THEME_IDS = ["default", "literary", "tech", "business", "magazine"];

const REPRESENTATIVE_MD = [
  "# 标题一",
  "",
  "正文段落。",
  "",
  "`行内代码`",
  "",
  ":inline-code[单独行内代码标记]",
  "",
  "```",
  "围栏代码块内容",
  "```",
  "",
  ":::paragraph{.dropcap}",
  "首字下沉正文",
  ":::",
  "",
  ":::quote{.dropcap}",
  "引用首字下沉正文",
  ":::",
].join("\n");

describe("T-189 AC-005: renderMarkdown 代表性 block 全 5 主题产物零 font-family 声明", () => {
  for (const themeId of ALL_THEME_IDS) {
    it(`${themeId} 主题渲染代表性内容（heading/paragraph/inline-code/code-block/dropcap）后 HTML 不含 font-family 声明`, async () => {
      const result = await renderMarkdown(REPRESENTATIVE_MD, { themeId });
      expect(result.html).not.toMatch(/font-family\s*:/i);
    });
  }
});

describe("T-189 AC-005 负向探针: 关闭 output ruleset 后源头声明面本身不含 font-family（非仅依赖 output strip 兜底）", () => {
  it("default 主题在 rules: [] 关闭全部 ruleset（含 output 相 strip-font-family）时，渲染代表性内容仍不含 font-family 声明", async () => {
    const result = await renderMarkdown(REPRESENTATIVE_MD, {
      themeId: "default",
      rules: [],
    });
    expect(result.html).not.toMatch(/font-family\s*:/i);
  });
});
