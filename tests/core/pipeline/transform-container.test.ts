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

// AC-T121-003: container directive 渲染为正确的 data-block 容器结构
describe("AC-T121-003: container directive 渲染为正确的 data-block 容器结构", () => {
  it("callout 容器指令 → 含 data-block 和 data-variant 属性，嵌套内容完整", async () => {
    const result = await renderMarkdown(":::callout{.warning}\n内容段落\n:::", {
      themeId: "magazine",
    });

    expect(result.html).toMatch(/data-block="callout"/);
    expect(result.html).toMatch(/data-variant="warning"/);
    expect(result.html).toMatch(/内容段落/);
    expect(result.html).not.toContain("undefined");
  });

  it("无 class 属性的 callout 指令 → data-variant='default'", async () => {
    const result = await renderMarkdown(":::callout\nx\n:::", { themeId: "default" });

    expect(result.html).toMatch(/data-block="callout"/);
    expect(result.html).toMatch(/data-variant="default"/);
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
