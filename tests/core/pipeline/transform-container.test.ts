import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getBlockBaseStyle,
  registerVariant,
  renderMarkdown,
  resetBlockRegistry,
  resetVariantRegistry,
} from "../../../packages/core/src/index.ts";
import "../../../packages/blocks/src/index.ts";

beforeEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
});

// AC-T121-001: containerDirective 展开为带 data-block 的骨架 HTML
describe("AC-T121-001: containerDirective 展开为带 data-block 的骨架 HTML", () => {
  it('callout 容器指令 → 外层元素含 data-block="callout"，body slot 含 <p>content</p>', async () => {
    const result = await renderMarkdown(":::callout{.warning}\ncontent\n:::", {
      themeId: "default",
    });
    // outer container must carry data-block="callout"
    expect(result.html).toMatch(/data-block="callout"/);
    // body slot must contain the paragraph content
    expect(result.html).toMatch(/<p[^>]*>content<\/p>/);
  });
});

// AC-T121-002: 注册 variant 后渲染 callout 容器 style 含 variant baseStyle
describe("AC-T121-002: 注册 my-variant 后渲染 callout 容器 style 含 variant root 样式", () => {
  it("callout{.my-variant} → 容器元素 style 含 background-color:#123456", async () => {
    registerVariant({
      blockId: "callout",
      id: "my-variant",
      label: "X",
      style: { root: { "background-color": "#123456" } },
    });

    const baseStyle = getBlockBaseStyle("callout", "my-variant");
    expect(baseStyle["background-color"]).toBe("#123456");

    const result = await renderMarkdown(":::callout{.my-variant}\ncontent\n:::", {
      themeId: "default",
    });
    // The container element style must contain the variant's root background-color
    expect(result.html).toMatch(/background-color:\s*#123456/);
  });
});

// AC-T121-003: transformToHast options 被消费（不再是 _options 未读）
describe("AC-T121-003: transformToHast options 被消费（不再是 _options 未读）", () => {
  it("callout 容器展开时 options 被内部读取：HTML 含 data-block 且 themeId='magazine' 不产生 undefined 内容", async () => {
    // The current _options parameter is unused — container directives are not expanded.
    // GREEN must rename _options → options and use it inside the directive expansion path.
    // This test verifies the container directive is expanded (data-block attribute present),
    // which requires the transform to consume the options for context.
    // If options is still unused (_options), containers won't be expanded → no data-block → FAIL.
    const result = await renderMarkdown(":::callout\nx\n:::", { themeId: "magazine" });

    // Container must be expanded with data-block attribute — requires options-aware transform
    expect(result.html).toMatch(/data-block="callout"/);

    // No literal "undefined" strings should appear (options.themeId must be read, not treated as undefined)
    expect(result.html).not.toContain("undefined");
  });
});

// AC-T121-004: attrsSchema 缺必填字段时 diagnostics 含 warning 且渲染不中断
describe("AC-T121-004: attrsSchema 缺必填字段 → diagnostics warning + 渲染不中断", () => {
  it("steps directive 缺 steps 字段 → result.diagnostics 含 source:'transform' severity:'warning'，html 仍含 content 文本", async () => {
    // steps attrsSchema requires a `steps` array — providing an empty directive omits it
    const result = await renderMarkdown(":::steps{.list}\ncontent\n:::", {
      themeId: "default",
    });

    // Render must not throw and html must be non-empty
    expect(typeof result.html).toBe("string");
    expect(result.html.length).toBeGreaterThan(0);
    // Content text must survive in degraded output
    expect(result.html).toMatch(/content/);

    // diagnostics must contain a warning from the transform stage
    const transformWarning = result.diagnostics.find(
      (d) => d.source === "transform" && d.severity === "warning"
    );
    expect(transformWarning).toBeDefined();
  });
});
