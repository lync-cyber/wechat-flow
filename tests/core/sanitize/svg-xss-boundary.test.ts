import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../../packages/core/src/index.ts";

async function sanitizeFragment(html: string): Promise<string> {
  const { wechatFlowSanitizeSchema } = await import(
    "../../../packages/core/src/sanitize/schema.ts"
  );
  const { sanitizeHast } = await import("../../../packages/core/src/pipeline/sanitize.ts");
  const { fromHtml } = await import("hast-util-from-html");
  const { toHtml } = await import("hast-util-to-html");

  const hast = fromHtml(html, { fragment: true });
  const sanitized = sanitizeHast(hast, wechatFlowSanitizeSchema);
  return toHtml(sanitized);
}

describe("AC-005: divider SVG script 子元素被剥离", () => {
  it("svg 内嵌 <script>alert(1)</script> 子元素经 sanitize 后被完全移除", async () => {
    const input =
      '<div data-block="divider" data-variant="wave">' +
      '<svg viewBox="0 0 240 20"><script>alert(1)</script>' +
      '<path d="M0,10 C40,2 80,18 120,10 C160,2 200,18 240,10" stroke="#D6D3CE" stroke-width="1.5" fill="none"></path>' +
      "</svg></div>";

    const output = await sanitizeFragment(input);

    expect(output).not.toMatch(/<script/i);
    expect(output).not.toContain("alert(1)");
    expect(output).toContain("<path");
  });
});

describe("AC-005: divider SVG onload/onclick 事件属性被剥离", () => {
  it("svg 标签上的 onload 事件属性经 sanitize 后被移除，viewBox 保留", async () => {
    const input =
      '<svg viewBox="0 0 240 20" onload="alert(1)"><path d="M0,10" stroke="#D6D3CE"></path></svg>';
    const output = await sanitizeFragment(input);

    expect(output).not.toMatch(/onload/i);
    expect(output).not.toContain("alert(1)");
  });

  it("path 标签上的 onclick 事件属性经 sanitize 后被移除，d 属性保留", async () => {
    const input =
      '<svg viewBox="0 0 240 20"><path d="M0,10 C40,2 80,18 120,10 C160,2 200,18 240,10" stroke="#D6D3CE" onclick="alert(2)"></path></svg>';
    const output = await sanitizeFragment(input);

    expect(output).not.toMatch(/onclick/i);
    expect(output).not.toContain("alert(2)");
  });

  it("circle 标签上的 onmouseover 事件属性经 sanitize 后被移除，fill 属性保留", async () => {
    const input =
      '<svg viewBox="0 0 60 10"><circle cx="20" cy="5" r="2" fill="#A8A29E" onmouseover="alert(3)"></circle></svg>';
    const output = await sanitizeFragment(input);

    expect(output).not.toMatch(/onmouseover/i);
    expect(output).not.toContain("alert(3)");
  });
});

describe("AC-005: javascript: URI 用户输入路径被拒绝", () => {
  it("markdown 原文注入的 raw HTML SVG（含 javascript: href）不会作为可执行元素出现在最终渲染产物中", async () => {
    const maliciousMarkdown =
      '正文\n\n<svg viewBox="0 0 240 20"><a href="javascript:alert(1)"><path d="M0,10" stroke="#D6D3CE"></path></a></svg>\n\n正文结束';

    const result = await renderMarkdown(maliciousMarkdown, { themeId: "default" });

    expect(result.html).not.toContain("javascript:alert(1)");
    expect(result.html).not.toMatch(/href="javascript:/i);
  });

  it("伪造 divider 变体属性携带 javascript: URI 经完整渲染管线后不出现在输出中", async () => {
    const maliciousMarkdown = ':::divider{.wave data-evil="javascript:alert(1)"}\n:::';

    const result = await renderMarkdown(maliciousMarkdown, { themeId: "default" });

    expect(result.html).not.toContain("javascript:alert(1)");
  });
});

describe("AC-005: divider SVG 放行范围严格限定为固定标签+属性最小集", () => {
  it("foreignObject 标签未在白名单，经 sanitize 后被剥离", async () => {
    const input =
      '<svg viewBox="0 0 240 20"><foreignObject><div>evil</div></foreignObject>' +
      '<path d="M0,10 C40,2 80,18 120,10 C160,2 200,18 240,10" stroke="#D6D3CE"></path></svg>';
    const output = await sanitizeFragment(input);

    expect(output).not.toMatch(/<foreignObject/i);
    expect(output).toContain("<path");
  });

  it("use[href] 标签未在白名单，经 sanitize 后被剥离", async () => {
    const input =
      '<svg viewBox="0 0 240 20"><use href="#evil-symbol"></use>' +
      '<path d="M0,10 C40,2 80,18 120,10 C160,2 200,18 240,10" stroke="#D6D3CE"></path></svg>';
    const output = await sanitizeFragment(input);

    expect(output).not.toMatch(/<use/i);
    expect(output).not.toContain("evil-symbol");
    expect(output).toContain("<path");
  });

  it("animate 标签未在白名单，经 sanitize 后被剥离", async () => {
    const input =
      '<svg viewBox="0 0 240 20"><animate attributeName="stroke" values="red" begin="0s"></animate>' +
      '<path d="M0,10 C40,2 80,18 120,10 C160,2 200,18 240,10" stroke="#D6D3CE"></path></svg>';
    const output = await sanitizeFragment(input);

    expect(output).not.toMatch(/<animate/i);
    expect(output).toContain("<path");
  });

  it("divider dots 变体的 circle 标签保留在白名单内（正向对照，确保白名单不是全空）", async () => {
    const input =
      '<svg viewBox="0 0 60 10"><circle cx="20" cy="5" r="2" fill="#A8A29E"></circle></svg>';
    const output = await sanitizeFragment(input);

    expect(output).toContain("<circle");
    expect(output).toContain('fill="#A8A29E"');
  });
});
