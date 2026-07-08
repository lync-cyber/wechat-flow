import type { Element, Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { beforeAll, describe, expect, it } from "vitest";
import { registerTheme, renderMarkdown } from "../../packages/core/src/index.ts";
import "../../packages/blocks/src/index.ts";
import defaultTheme from "../../packages/themes/default/src/index.ts";

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

describe("AC-005: paragraph dropcap 根容器基线样式", () => {
  it("paragraph dropcap 根容器（data-block=paragraph）计算样式含 margin: 16px 0", async () => {
    const { html } = await renderMarkdown(":::paragraph{.dropcap}\n首字下沉段落内容。\n:::", {
      themeId: "default",
    });
    const tree = fromHtml(html, { fragment: true });
    const elements = collectElements(tree);
    const root = elements.find((el) => el.properties?.dataBlock === "paragraph");
    expect(root).toBeDefined();

    const style = parseStyleDict(root?.properties?.style);
    expect(style.margin).toBe("16px 0");
  });
});

describe("AC-005: pull-quote decorated quote-mark 槽位不含 position 声明", () => {
  it("quote-mark 装饰元素（「」符号）计算样式中不含 position 属性", async () => {
    const { html } = await renderMarkdown(
      ':::pull-quote{.decorated author="鲁迅"}\n人类总是低估自己能够承受的重量。\n:::',
      { themeId: "default" }
    );
    const tree = fromHtml(html, { fragment: true });
    const elements = collectElements(tree);

    // quote-mark 槽位携带既有特征样式 opacity: 0.35 + vertical-align: top，用其稳定识别，
    // 不依赖尚待改造的 tagName 细节。
    const quoteMark = elements.find((el) => {
      const style = parseStyleDict(el.properties?.style);
      return style.opacity === "0.35" && style["vertical-align"] === "top";
    });
    expect(quoteMark).toBeDefined();

    const style = parseStyleDict(quoteMark?.properties?.style);
    expect(style.position).toBeUndefined();
  });
});
