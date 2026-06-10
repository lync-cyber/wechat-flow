import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../packages/core/src/index.ts";
import { filterCssAttrs } from "../../packages/core/src/pipeline/css-attr-filter.ts";

// AC-001 & AC-003 depend on the not-yet-implemented sanitize pipeline.
// We load the module dynamically so RED failure happens at runtime (module not found),
// not at compile time — preserving the GREEN phase's ability to introduce the file.

describe("AC-001: script 标签被 sanitize 阶段完全移除", () => {
  it("含 <script>alert(1)</script> 的 HTML 输入经 sanitize 后输出不含 <script 标签也不含 alert(1) 调用", async () => {
    // Dynamically import the not-yet-existing sanitize module to cause RED via missing module.
    const { sanitizeHast } = await import("../../packages/core/src/pipeline/sanitize.ts");
    const { fromHtml } = await import("hast-util-from-html");

    const input = "<div><script>alert(1)</script><p>safe</p></div>";
    const hast = fromHtml(input, { fragment: true });
    const sanitized = sanitizeHast(hast);

    const { toHtml } = await import("hast-util-to-html");
    const output = toHtml(sanitized);

    // Structural assertion: no <script tag in any form
    expect(output).not.toMatch(/<script/i);
    // Payload assertion: XSS execution vector is gone
    expect(output).not.toContain("alert(1)");
    // Safe content remains
    expect(output).toContain("<p>");
  });
});

describe("AC-002: css-attr-filter 移除 style 属性中的 javascript: 声明，保留合法声明", () => {
  it("过滤后输出包含 color:red 但不包含 javascript: 声明", () => {
    // Current filterCssAttrs does whole-value blocking with url(javascript:) pattern.
    // GREEN will extend it to per-declaration filtering of bare `javascript:` tokens.
    // The input below does NOT match /url\s*\(\s*javascript:/i so current impl returns
    // the full value unchanged — the assertion that `javascript:` is absent will FAIL (RED).
    const input = "color:red; javascript:void(0)";
    const output = filterCssAttrs(input);

    // javascript: pseudo-protocol must be stripped
    expect(output).not.toContain("javascript:");
    // Legitimate declaration must be preserved
    expect(output).toContain("color:red");
  });

  it("只含合法 CSS 声明时原样返回", () => {
    const input = "color:red; font-size:16px";
    const output = filterCssAttrs(input);
    expect(output).toBe("color:red; font-size:16px");
  });
});

describe("AC-003: extendSanitizeSchema 注册的自定义标签通过 sanitize 不被剥除", () => {
  it("wf-card 标签经 sanitize 后保留在输出中且 variant 属性完整", async () => {
    // Import the not-yet-existing schema module — RED failure here (module not found).
    const { wechatFlowSanitizeSchema, applySanitizeExtension } = await import(
      "../../packages/core/src/sanitize/schema.ts"
    );
    const { extendSanitizeSchema } = await import(
      "../../packages/contracts/src/sanitize/extend-schema.ts"
    );
    const { sanitizeHast } = await import("../../packages/core/src/pipeline/sanitize.ts");
    const { fromHtml } = await import("hast-util-from-html");
    const { toHtml } = await import("hast-util-to-html");

    const extension = extendSanitizeSchema(
      new Set(["wf-card"]),
      new Map([["wf-card", ["variant", "accent"]]])
    );

    const mergedSchema = applySanitizeExtension(wechatFlowSanitizeSchema, extension);
    const input = '<wf-card variant="feature" accent="blue">content</wf-card>';
    const hast = fromHtml(input, { fragment: true });
    const sanitized = sanitizeHast(hast, mergedSchema);
    const output = toHtml(sanitized);

    // Tag must survive
    expect(output).toMatch(/<wf-card/);
    // Registered attribute must survive
    expect(output).toContain('variant="feature"');
  });
});

describe("AC-004: css-attr-filter 过滤 expression( CSS 值", () => {
  it("含 expression(alert(1)) 的 CSS 值被过滤后不出现在输出中", () => {
    const input = "width: expression(alert(1))";
    const output = filterCssAttrs(input);

    // The expression() payload must be entirely absent
    expect(output).not.toContain("expression(");
    expect(output).not.toContain("alert(1)");
  });

  it("纯合法值不受影响", () => {
    const input = "margin: 0 auto; color: #333";
    const output = filterCssAttrs(input);
    expect(output).toBe("margin: 0 auto; color: #333");
  });
});

describe("R-002/R-005: css-attr-filter CSS 转义绕过防御", () => {
  it("CSS hex 转义向量 j\\61vascript:void(0) 被过滤，输出不含 javascript:", () => {
    // `\61` is the CSS hex escape for 'a', so `j\61vascript:` decodes to `javascript:`
    const input = "j\\61vascript:void(0)";
    const output = filterCssAttrs(input);
    expect(output).not.toContain("javascript:");
    expect(output).not.toContain("j\\61vascript:");
  });

  it("CSS 注释拆分向量 java/**/script: 被过滤，输出不含 javascript:", () => {
    // Comments stripped before pattern match so `java/**/script:` collapses to `javascript:`
    const input = "java/**/script:alert(1)";
    const output = filterCssAttrs(input);
    expect(output).not.toContain("javascript:");
    expect(output).not.toContain("java/**/script:");
  });

  it("-moz-binding:url(evil) 被过滤，合法声明 color:red 保留", () => {
    const input = "color:red; -moz-binding:url(evil)";
    const output = filterCssAttrs(input);
    expect(output).not.toContain("-moz-binding");
    expect(output).toContain("color:red");
  });

  it("合法 CSS 值 color:red 通过归一化后不被误杀", () => {
    const input = "color:red";
    const output = filterCssAttrs(input);
    expect(output).toContain("color:red");
    expect(output).not.toBe("");
  });
});

describe("AC-005: renderMarkdown 返回值包含 postPaste: false 字段", () => {
  it("renderMarkdown 返回的 RenderResult 包含 postPaste 字段且值为 false", async () => {
    const result = await renderMarkdown("# 标题\n\n段落");

    expect((result as Record<string, unknown>).postPaste).toBe(false);
  });

  it("renderMarkdownResponseSchema 能解析含 postPaste 字段的响应", async () => {
    const { renderMarkdownResponseSchema } = await import(
      "../../packages/contracts/src/mcp/tool-contracts.ts"
    );

    const parsed = renderMarkdownResponseSchema.safeParse({
      html: "<p>hi</p>",
      diagnostics: [],
      rulesetVersion: "0.0.0",
      themeVersion: "0.0.0",
      postPaste: false,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect((parsed.data as Record<string, unknown>).postPaste).toBe(false);
    }
  });

  it("postPaste: true 经 schema 解析后穿透保留（composeCopy 路径契约）", async () => {
    const { renderMarkdownResponseSchema } = await import(
      "../../packages/contracts/src/mcp/tool-contracts.ts"
    );

    const parsed = renderMarkdownResponseSchema.safeParse({
      html: "<p>hi</p>",
      diagnostics: [],
      rulesetVersion: "0.0.0",
      themeVersion: "0.0.0",
      postPaste: true,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect((parsed.data as Record<string, unknown>).postPaste).toBe(true);
    }
  });

  it("缺失 postPaste 字段的响应解析失败（字段为必填，禁止静默缺省）", async () => {
    const { renderMarkdownResponseSchema } = await import(
      "../../packages/contracts/src/mcp/tool-contracts.ts"
    );

    const parsed = renderMarkdownResponseSchema.safeParse({
      html: "<p>hi</p>",
      diagnostics: [],
      rulesetVersion: "0.0.0",
      themeVersion: "0.0.0",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const paths = parsed.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("postPaste");
    }
  });
});
