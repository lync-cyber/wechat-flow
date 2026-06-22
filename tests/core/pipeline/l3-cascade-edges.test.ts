import type { Root } from "hast";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  describeBlock,
  describeVariant,
  inlineStyle,
  registerBlock,
  registerVariant,
  renderMarkdown,
  resetBlockRegistry,
  resetVariantRegistry,
} from "../../../packages/core/src/index.ts";
// Side-effect import registers all built-in blocks (incl. callout) and an onRegistryReset
// hook, so resetBlockRegistry() in beforeEach re-registers them for every test.
import "../../../packages/blocks/src/index.ts";

beforeEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
});

// custom-css L3: 多元素 + 嵌套 + 未匹配元素的级联合并
describe("custom-css L3 级联：多元素 / 嵌套 / 未匹配", () => {
  it("customCss 命中 h1 与嵌套 strong，未命中的 p 保留主题样式", async () => {
    const md = "# 标题 **粗体**\n\n普通段落\n\n> 引用文字";
    const result = await renderMarkdown(md, {
      themeId: "default",
      customCss: "h1 { color: red; } strong { color: blue; }",
    });
    // 顶层匹配元素内联
    expect(result.html).toMatch(/<h1[^>]*style="[^"]*color:\s*red/);
    // 嵌套元素递归内联（h1 > strong）
    expect(result.html).toMatch(/<strong[^>]*style="[^"]*color:\s*blue/);
    // 未被 customCss 命中的元素仍渲染、保留主题内联样式
    expect(result.html).toContain("普通段落");
    expect(result.html).toMatch(/<p[^>]*style=/);
  });
});

// M-005 注册守护边界
describe("M-005 注册守护边界", () => {
  it("registerBlock: baseStyle 缺 root 槽位 → 抛错且不注册", () => {
    expect(() =>
      registerBlock({
        id: "edge-block",
        name: "Edge",
        attrsSchema: z.object({}),
        variants: [{ id: "default" }],
        baseStyle: { title: { color: "#000000" } },
        slots: ["root"],
      })
    ).toThrow(/root/);
    expect(describeBlock("edge-block")).toBeUndefined();
  });

  it("registerVariant: 含 XSS 声明 → 以 XSS 理由拒绝且不注册", () => {
    let caught: { rejectedDeclarations?: Array<{ reason: string }> } | undefined;
    try {
      registerVariant({
        blockId: "callout",
        id: "edge:xss",
        label: "XSS",
        style: { root: { background: "url(javascript:alert(1))" } },
      });
    } catch (e) {
      caught = e as typeof caught;
    }
    expect(caught).toBeDefined();
    expect(caught?.rejectedDeclarations?.some((d) => /XSS/.test(d.reason))).toBe(true);
    expect(describeVariant("edge:xss")).toBeUndefined();
  });

  it("describeVariant: 注册后按 id 命中返回条目", () => {
    registerVariant({
      blockId: "callout",
      id: "edge:dv",
      label: "DV",
      style: { root: { color: "#123456" } },
    });
    const v = describeVariant("edge:dv");
    expect(v?.id).toBe("edge:dv");
    expect(v?.blockId).toBe("callout");
  });
});

// inline-style 容器路径边界（直接 hast 单元）
describe("inline-style 容器路径边界", () => {
  it("data-block 元素缺 data-variant → 回退 default 变体的 base-style", () => {
    registerBlock({
      id: "edge-blk",
      name: "EdgeBlk",
      attrsSchema: z.object({}),
      variants: [{ id: "default" }],
      baseStyle: { root: { color: "#abcdef" } },
      slots: ["root"],
    });
    const hast = {
      type: "root",
      children: [
        { type: "element", tagName: "div", properties: { "data-block": "edge-blk" }, children: [] },
      ],
    } as Root;
    const styled = inlineStyle(hast);
    const div = styled.children[0] as { properties: { style?: string } };
    expect(div.properties.style).toMatch(/color:\s*#abcdef/);
  });

  it("themeTokens 含 (block,variant) override → L2 覆盖 L1，未覆盖项保留 L1", () => {
    registerBlock({
      id: "edge-blk2",
      name: "EdgeBlk2",
      attrsSchema: z.object({}),
      variants: [{ id: "default" }],
      baseStyle: { root: { color: "#111111", padding: "8px" } },
      slots: ["root"],
    });
    const hast = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "div",
          properties: { "data-block": "edge-blk2", "data-variant": "default" },
          children: [],
        },
      ],
    } as Root;
    const themeTokens = { "edge-blk2": { default: { color: "#999999" } } };
    const styled = inlineStyle(hast, themeTokens);
    const div = styled.children[0] as { properties: { style?: string } };
    expect(div.properties.style).toMatch(/color:\s*#999999/); // L2 覆盖
    expect(div.properties.style).toMatch(/padding:\s*8px/); // L1 保留
  });
});
