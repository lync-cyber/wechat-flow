import { beforeAll, describe, expect, it } from "vitest";
import { registerTheme, renderMarkdown } from "../../../packages/core/src/index.ts";
import "../../../packages/marks/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";

beforeAll(() => {
  registerTheme(defaultTheme);
});

describe("R-002: customCss 的 -webkit- 值模式被 output 相剥离，不渗透进最终 HTML", () => {
  it("background: -webkit-linear-gradient(...) 与 display: -webkit-box 均不出现在渲染产物中", async () => {
    const result = await renderMarkdown("正文段落。", {
      themeId: "default",
      customCss:
        "p{background:-webkit-linear-gradient(red,blue);display:-webkit-box;-webkit-line-clamp:3}",
    });

    expect(result.html).not.toMatch(/-webkit-linear-gradient/);
    expect(result.html).not.toMatch(/display:\s*-webkit-box/);
  });

  it("剥离产生 nodeChangeRecords 诊断可见记录", async () => {
    const result = await renderMarkdown("正文段落。", {
      themeId: "default",
      customCss: "p{background:-webkit-linear-gradient(red,blue);display:-webkit-box}",
    });

    const stripRecord = result.report.nodeChangeRecords.find(
      (record) => record.triggerRuleId === "strip-forbidden-value-pattern"
    );
    expect(stripRecord).toBeDefined();
  });

  it("既有的 -webkit-text-emphasis 例外白名单声明（emphasis 内置 mark）不受本规则误伤", async () => {
    const result = await renderMarkdown(":emphasis[重点]", { themeId: "default" });

    expect(result.html).toMatch(/-webkit-text-emphasis/);
  });
});
