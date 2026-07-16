import type { Element, Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { beforeAll, describe, expect, it } from "vitest";
import {
  describeBlock,
  getUnimplementedVariants,
  registerTheme,
  renderMarkdown,
  runVariantDiffGuard,
} from "../../packages/core/src/index.ts";
import "../../packages/blocks/src/index.ts";
import defaultTheme from "../../packages/themes/default/src/index.ts";
import { buildDirectiveMarkdown } from "./directive-markdown-fixtures.ts";

const TARGET_VARIANTS: Array<{ blockId: string; variantId: string }> = [
  { blockId: "footnote", variantId: "numbered" },
  { blockId: "footnote", variantId: "inline" },
  { blockId: "heading", variantId: "underline" },
  { blockId: "heading", variantId: "centered" },
  { blockId: "paragraph", variantId: "indented" },
  { blockId: "paragraph", variantId: "spaced" },
  { blockId: "list", variantId: "bullet" },
  { blockId: "list", variantId: "numbered" },
  { blockId: "list", variantId: "checklist" },
];

const FOOTNOTE_BODY = "这是一条脚注说明文字。";
const HEADING_BODY = "示例小节标题正文。";
const PARAGRAPH_BODY = "这是一段用于测试的正文内容。";
const LIST_BODY = "- 列表条目一\n- 列表条目二";

function buildMarkdownForDiffGuard(blockId: string, variantId: string): string {
  if (blockId === "list") {
    return `:::list{.${variantId}}\n${LIST_BODY}\n:::`;
  }
  return buildDirectiveMarkdown(blockId, variantId);
}

beforeAll(() => {
  registerTheme(defaultTheme);
});

function collectElements(node: Root | Element): Element[] {
  const result: Element[] = [];
  for (const child of node.children) {
    if (child.type === "element") {
      const el = child as Element;
      result.push(el);
      result.push(...collectElements(el));
    }
  }
  return result;
}

function parseStyleDict(style: unknown): Record<string, string> {
  const dict: Record<string, string> = {};
  if (typeof style !== "string") return dict;
  for (const decl of style.split(";")) {
    const trimmed = decl.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    dict[trimmed.slice(0, idx).trim().toLowerCase()] = trimmed.slice(idx + 1).trim();
  }
  return dict;
}

function findElementWithText(elements: Element[], text: string): Element | undefined {
  return elements.find((el) =>
    el.children.some((child) => child.type === "text" && child.value === text)
  );
}

async function renderBlock(
  blockId: string,
  variantId: string,
  body: string,
  themeId = "default"
): Promise<{ elements: Element[]; root: Element | undefined; html: string }> {
  const { html } = await renderMarkdown(`:::${blockId}{.${variantId}}\n${body}\n:::`, {
    themeId,
  });
  const tree = fromHtml(html, { fragment: true });
  const elements = collectElements(tree);
  const root = elements.find(
    (el) => el.properties?.dataBlock === blockId && el.properties?.dataVariant === variantId
  );
  return { elements, root, html };
}

describe("AC-001: footnote.numbered hanging indent 编号悬挂声明", () => {
  it("root padding-left 与 text-indent 负值绝对值相等（hanging indent 不变式）", async () => {
    const { root } = await renderBlock("footnote", "numbered", FOOTNOTE_BODY);
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    const indent = style["text-indent"];
    expect(indent).toBeTruthy();
    expect(indent?.startsWith("-")).toBe(true);
    const paddingTokens = style.padding?.trim().split(/\s+/) ?? [];
    const paddingLeft = paddingTokens[paddingTokens.length - 1];
    expect(paddingLeft).toBeTruthy();
    expect(indent?.slice(1)).toBe(paddingLeft);
  });

  it("root line-height 声明为逐条紧凑值 1.5", async () => {
    const { root } = await renderBlock("footnote", "numbered", FOOTNOTE_BODY);
    const style = parseStyleDict(root?.properties?.style);
    expect(style["line-height"]).toBe("1.5");
  });
});

describe("AC-001: footnote.inline 流式排列（非逐条独立行等效声明）", () => {
  it("root 不含 hanging indent 声明（无 text-indent）", async () => {
    const { root } = await renderBlock("footnote", "inline", FOOTNOTE_BODY);
    const style = parseStyleDict(root?.properties?.style);
    expect(style["text-indent"]).toBeUndefined();
  });

  it("root 含 max-height + overflow-y:auto 的流式滚动声明", async () => {
    const { root } = await renderBlock("footnote", "inline", FOOTNOTE_BODY);
    const style = parseStyleDict(root?.properties?.style);
    expect(style["max-height"]).toBeTruthy();
    expect(style["overflow-y"]).toBe("auto");
  });
});

describe("AC-002: heading.underline root 2px 主色底线", () => {
  it("root border-bottom 为 2px 实线", async () => {
    const { root } = await renderBlock("heading", "underline", HEADING_BODY);
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    const match = style["border-bottom"]?.match(/^([\d.]+)px\s+solid/);
    expect(match, `expected px border-bottom, got: ${style["border-bottom"]}`).not.toBeNull();
    expect(Number.parseFloat(match?.[1] ?? "NaN")).toBe(2);
  });
});

describe("AC-002: heading.centered root text-align:center", () => {
  it("root text-align 为 center", async () => {
    const { root } = await renderBlock("heading", "centered", HEADING_BODY);
    const style = parseStyleDict(root?.properties?.style);
    expect(style["text-align"]).toBe("center");
  });
});

describe("AC-003: paragraph.indented root text-indent:2em", () => {
  it("root text-indent 声明为首行缩进两字宽（em 值经 transform-em-to-px 转为等效 px）", async () => {
    const { root } = await renderBlock("paragraph", "indented", PARAGRAPH_BODY);
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    const match = style["text-indent"]?.match(/^([\d.]+)px$/);
    expect(match, `expected px text-indent, got: ${style["text-indent"]}`).not.toBeNull();
    expect(Number.parseFloat(match?.[1] ?? "NaN")).toBe(32);
  });
});

describe("AC-003: paragraph.spaced root line-height 大于默认段落行距基线", () => {
  it("spaced root line-height 数值大于 default 变体正文行距", async () => {
    const { elements: defaultElements } = await renderBlock("paragraph", "default", PARAGRAPH_BODY);
    const defaultParagraph = defaultElements.find((el) => el.tagName === "p");
    const defaultLineHeight = Number.parseFloat(
      parseStyleDict(defaultParagraph?.properties?.style)["line-height"] ?? "NaN"
    );
    expect(defaultLineHeight).not.toBeNaN();

    const { root } = await renderBlock("paragraph", "spaced", PARAGRAPH_BODY);
    const spacedLineHeight = Number.parseFloat(
      parseStyleDict(root?.properties?.style)["line-height"] ?? "NaN"
    );
    expect(spacedLineHeight).not.toBeNaN();
    expect(spacedLineHeight).toBeGreaterThan(defaultLineHeight);
  });
});

describe("AC-004: list.bullet 自定义圆点 marker 颜色/形态（非浏览器默认）", () => {
  it("每项前缀为自定义圆点字符 ●（非浏览器默认 •）", async () => {
    const { elements } = await renderBlock("list", "bullet", LIST_BODY);
    expect(findElementWithText(elements, "●")).toBeDefined();
    expect(findElementWithText(elements, "•")).toBeUndefined();
  });

  it("marker 携带非空 color 声明", async () => {
    const { elements } = await renderBlock("list", "bullet", LIST_BODY);
    const marker = findElementWithText(elements, "●");
    const style = parseStyleDict(marker?.properties?.style);
    expect(style.color).toBeTruthy();
  });
});

describe("AC-004: list.numbered 有序列表编号样式生效", () => {
  it("渲染产物依次含编号 1. 与 2.", async () => {
    const { elements } = await renderBlock("list", "numbered", LIST_BODY);
    expect(findElementWithText(elements, "1.")).toBeDefined();
    expect(findElementWithText(elements, "2.")).toBeDefined();
  });

  it("编号 marker 携带 font-weight:700 声明", async () => {
    const { elements } = await renderBlock("list", "numbered", LIST_BODY);
    const marker = findElementWithText(elements, "1.");
    const style = parseStyleDict(marker?.properties?.style);
    expect(style["font-weight"]).toBe("700");
  });
});

describe("AC-004: list.checklist 每项前缀含 ☐/☑ unicode 字符节点", () => {
  it("未勾选项前缀为 ☐，已勾选项前缀为 ☑", async () => {
    const { html } = await renderMarkdown(
      ":::list{.checklist}\n- [ ] 待办事项一\n- [x] 待办事项二\n:::",
      { themeId: "default" }
    );
    const tree = fromHtml(html, { fragment: true });
    const elements = collectElements(tree);
    expect(findElementWithText(elements, "☐")).toBeDefined();
    expect(findElementWithText(elements, "☑")).toBeDefined();
  });

  it("勾选状态字符携带非空 color 声明（非新增列表符号 CSS，而是文本节点装饰）", async () => {
    const { html } = await renderMarkdown(":::list{.checklist}\n- [ ] 待办事项一\n:::", {
      themeId: "default",
    });
    const tree = fromHtml(html, { fragment: true });
    const elements = collectElements(tree);
    const marker = findElementWithText(elements, "☐");
    expect(marker).toBeDefined();
    const style = parseStyleDict(marker?.properties?.style);
    expect(style.color).toBeTruthy();
  });
});

describe("AC-005: 9 项缺口变体满足 T-191 未实现谓词与 T-192 差分守卫", () => {
  it("getUnimplementedVariants() 不含目标 9 变体", () => {
    const unimplemented = new Set(
      getUnimplementedVariants().map((v) => `${v.blockId}::${v.variantId}`)
    );
    for (const { blockId, variantId } of TARGET_VARIANTS) {
      expect(unimplemented.has(`${blockId}::${variantId}`)).toBe(false);
    }
  });

  it("runVariantDiffGuard 不将目标 9 变体判定为渲染同 default 的 finding", async () => {
    const findings = await runVariantDiffGuard({
      buildMarkdown: buildMarkdownForDiffGuard,
      themeId: "default",
    });
    const findingKeys = new Set(findings.map((f) => `${f.blockId}::${f.variantId}`));
    for (const { blockId, variantId } of TARGET_VARIANTS) {
      expect(findingKeys.has(`${blockId}::${variantId}`)).toBe(false);
    }
  });

  it("每项目标变体满足谓词①（自身 baseStyle delta）或②（块 decorate 钩子）", () => {
    for (const { blockId, variantId } of TARGET_VARIANTS) {
      const def = describeBlock(blockId);
      const variant = def?.variants.find((v) => v.id === variantId);
      const hasOwnDelta = Boolean(
        variant?.baseStyle &&
          Object.values(variant.baseStyle).some((slot) => Object.keys(slot).length > 0)
      );
      const hasDecorate = Boolean(def?.decorate);
      expect(hasOwnDelta || hasDecorate).toBe(true);
    }
  });
});

describe("回归: footnote/heading/paragraph/list 的 default 渲染不受影响", () => {
  it("footnote.default root style 与既有基线一致", async () => {
    const { html } = await renderMarkdown(buildDirectiveMarkdown("footnote", "default"), {
      themeId: "default",
    });
    expect(html).toContain(
      'style="border-top: 1px solid #e0e0e0; color: #888888; font-size: 14px; line-height: 1.6; margin: 16px 0 0; padding: 8px 0"'
    );
  });

  it("heading.default 渲染无 root style 属性（无 baseStyle 声明，行为不变）", async () => {
    const { html } = await renderMarkdown(buildDirectiveMarkdown("heading", "default"), {
      themeId: "default",
    });
    expect(html).toContain('<section data-block="heading" data-variant="default">');
  });

  it("paragraph.default 渲染无 root style 属性（无 baseStyle 声明，行为不变）", async () => {
    const { html } = await renderMarkdown(buildDirectiveMarkdown("paragraph", "default"), {
      themeId: "default",
    });
    expect(html).toContain('<section data-block="paragraph" data-variant="default">');
  });

  it("list.default 渲染仍走 ul→table 转换且 marker 为原生 •", async () => {
    const { html } = await renderMarkdown(`:::list{.default}\n${LIST_BODY}\n:::`, {
      themeId: "default",
    });
    expect(html).toContain("<table");
    expect(html).toContain("•");
  });
});
