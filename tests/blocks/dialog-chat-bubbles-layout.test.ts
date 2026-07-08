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

// 对方(左) → 己方(右) → 对方(左)：验证「新 speaker 换侧、同 speaker 同侧」交替语义
const DIALOG_THREE_ROUNDS_MARKDOWN = [
  ':::dialog{.chat-bubbles speaker="对方"}',
  "你好，最近怎么样？",
  ":::",
  "",
  ':::dialog{.chat-bubbles speaker="己方"}',
  "还不错，谢谢关心。",
  ":::",
  "",
  ':::dialog{.chat-bubbles speaker="对方"}',
  "太好了，一起吃饭吧。",
  ":::",
].join("\n");

// 气泡携带既有 CHAT_BUBBLE_SHARED_STYLE 特征（display: inline-block + 左右各自背景色），
// 用这两项组合稳定识别气泡元素，不依赖尚待改造的 tagName/data-block-slot 细节。
function isChatBubble(style: Record<string, string>): boolean {
  const isLeftOrRightBubble = style.background === "#f3f0eb" || style.background === "#2d5a4e";
  return style.display === "inline-block" && isLeftOrRightBubble;
}

describe("AC-004: dialog chat-bubbles 双轮布局改造", () => {
  it("每轮行容器（root，data-block=dialog）计算样式含 display: table / width: 100% / table-layout: fixed", async () => {
    const { html } = await renderMarkdown(DIALOG_THREE_ROUNDS_MARKDOWN, { themeId: "default" });
    const tree = fromHtml(html, { fragment: true });
    const elements = collectElements(tree);
    const rows = elements.filter((el) => el.properties?.dataBlock === "dialog");
    expect(rows).toHaveLength(3);

    for (const row of rows) {
      const style = parseStyleDict(row.properties?.style);
      expect(style.display).toBe("table");
      expect(style.width).toBe("100%");
      expect(style["table-layout"]).toBe("fixed");
    }
  });

  it("气泡元素保持 display: inline-block，且样式中不含 margin-left: auto / margin-right: auto", async () => {
    const { html } = await renderMarkdown(DIALOG_THREE_ROUNDS_MARKDOWN, { themeId: "default" });
    const tree = fromHtml(html, { fragment: true });
    const elements = collectElements(tree);
    const bubbles = elements.filter((el) => isChatBubble(parseStyleDict(el.properties?.style)));
    expect(bubbles).toHaveLength(3);

    for (const bubble of bubbles) {
      const style = parseStyleDict(bubble.properties?.style);
      expect(style.display).toBe("inline-block");
      expect(style["margin-left"]).not.toBe("auto");
      expect(style["margin-right"]).not.toBe("auto");
    }
  });

  it("己方轮的内容 cell 计算样式 text-align: right，对方轮为 left", async () => {
    const { html } = await renderMarkdown(DIALOG_THREE_ROUNDS_MARKDOWN, { themeId: "default" });
    const tree = fromHtml(html, { fragment: true });
    const elements = collectElements(tree);
    const rows = elements.filter((el) => el.properties?.dataBlock === "dialog");
    expect(rows).toHaveLength(3);

    // 「内容 cell」定义为气泡的直接父元素（row → cell → bubble）；用直接父子关系定位，
    // 避免与气泡内部 <p> 正文自带的默认排版 text-align: left 样式混淆。
    function findDirectParent(root: Element, target: Element): Element | null {
      for (const child of root.children) {
        if (child.type !== "element") continue;
        const el = child as Element;
        if (el === target) return root;
        const found = findDirectParent(el, target);
        if (found) return found;
      }
      return null;
    }

    const cellTextAligns = rows.map((row) => {
      const bubble = collectElements(row).find((el) =>
        isChatBubble(parseStyleDict(el.properties?.style))
      );
      if (!bubble) return undefined;
      const cell = findDirectParent(row, bubble);
      return cell ? parseStyleDict(cell.properties?.style)["text-align"] : undefined;
    });

    expect(cellTextAligns).toEqual(["left", "right", "left"]);
  });

  it("speaker 交替语义不变：同 speaker 同侧（背景色一致）、新 speaker 换侧", async () => {
    const { html } = await renderMarkdown(DIALOG_THREE_ROUNDS_MARKDOWN, { themeId: "default" });
    const tree = fromHtml(html, { fragment: true });
    const elements = collectElements(tree);
    const bubbles = elements.filter((el) => isChatBubble(parseStyleDict(el.properties?.style)));
    expect(bubbles).toHaveLength(3);

    const backgrounds = bubbles.map((b) => parseStyleDict(b.properties?.style).background);
    expect(backgrounds).toEqual(["#f3f0eb", "#2d5a4e", "#f3f0eb"]);
  });
});
