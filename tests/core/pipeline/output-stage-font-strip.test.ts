import { beforeAll, describe, expect, it } from "vitest";
import { registerTheme, renderMarkdown } from "../../../packages/core/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";

beforeAll(() => {
  registerTheme(defaultTheme);
});

// T-183 AC-002: strip-font-family 迁 output 后剥除产物中全部生成 font-family 声明（决策①）。

describe("T-183 AC-002: renderMarkdown 产物不含任何 font-family 声明（决策①剥除）", () => {
  it("默认主题标题+段落渲染后 HTML 不含 font-family 声明", async () => {
    const result = await renderMarkdown("# 标题\n\n正文段落内容。", { themeId: "default" });

    expect(result.html).not.toMatch(/font-family\s*:/i);
  });
});
