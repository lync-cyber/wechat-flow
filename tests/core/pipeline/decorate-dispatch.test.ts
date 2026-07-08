import type { Element, Root as HastRoot } from "hast";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { parseMarkdown } from "../../../packages/core/src/pipeline/parse.ts";
import { transformToHast } from "../../../packages/core/src/pipeline/transform.ts";
import type { BlockDecorateContext } from "../../../packages/core/src/registry/block.ts";
import { registerBlock, resetBlockRegistry } from "../../../packages/core/src/registry/block.ts";
import { resetVariantRegistry } from "../../../packages/core/src/registry/variant.ts";
import "../../../packages/blocks/src/index.ts";

beforeEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
});

function findElementByDataBlock(node: HastRoot | Element, blockId: string): Element | undefined {
  const children = node.children as Array<HastRoot["children"][number]>;
  for (const child of children) {
    if (child.type === "element") {
      const el = child as Element;
      if (el.properties?.["data-block"] === blockId) {
        return el;
      }
      const found = findElementByDataBlock(el, blockId);
      if (found) return found;
    }
  }
  return undefined;
}

function findAllElementsByDataBlock(node: HastRoot | Element, blockId: string): Element[] {
  const results: Element[] = [];
  const children = node.children as Array<HastRoot["children"][number]>;
  for (const child of children) {
    if (child.type === "element") {
      const el = child as Element;
      if (el.properties?.["data-block"] === blockId) {
        results.push(el);
      }
      results.push(...findAllElementsByDataBlock(el, blockId));
    }
  }
  return results;
}

// AC-001: 分发机制 — core 管线不认识测试专用块，装饰效果仍需经 decorate 钩子在渲染产物中可观测
describe("AC-001: decorate 钩子分发机制", () => {
  it("注册块携带 decorate 钩子 → transformToHast 渲染后钩子对 hast 元素的修改可观测", () => {
    registerBlock({
      id: "t166-probe",
      name: "T166 Probe",
      category: "text",
      directiveAttrs: z.object({}).strict(),
      variants: [{ id: "default" }],
      slots: ["root"],
      decorate: (element) => {
        element.children = [
          ...element.children,
          {
            type: "element",
            tagName: "span",
            properties: { "data-t166-decorate-marker": "injected" },
            children: [{ type: "text", value: "DECORATED" }],
          },
        ];
      },
    });

    const mdast = parseMarkdown(":::t166-probe\ncontent\n:::");
    const hast = transformToHast(mdast, []);
    const el = findElementByDataBlock(hast, "t166-probe");
    expect(el).toBeDefined();

    const marker = el?.children.find(
      (child): child is Element =>
        child.type === "element" && child.properties?.["data-t166-decorate-marker"] === "injected"
    );
    expect(marker).toBeDefined();
    expect((marker?.children[0] as { value?: string } | undefined)?.value).toBe("DECORATED");
  });
});

// AC-001 负向: 无 decorate 钩子的注册块渲染不受影响
describe("AC-001 负向: 无 decorate 钩子的注册块", () => {
  it("渲染正常完成、无装饰注入、不抛错", () => {
    registerBlock({
      id: "t166-probe-nodeco",
      name: "T166 Probe No Decorate",
      category: "text",
      directiveAttrs: z.object({}).strict(),
      variants: [{ id: "default" }],
      slots: ["root"],
    });

    const mdast = parseMarkdown(":::t166-probe-nodeco\nplain content\n:::");
    let hast: HastRoot | undefined;
    expect(() => {
      hast = transformToHast(mdast, []);
    }).not.toThrow();

    const el = findElementByDataBlock(hast as HastRoot, "t166-probe-nodeco");
    expect(el).toBeDefined();
    expect(el?.children.length).toBe(1);
    const paragraph = el?.children[0] as Element;
    expect(paragraph.tagName).toBe("p");
  });
});

// AC-003: 文档级状态跨块实例贯穿同一文档渲染
describe("AC-003: ctx.docState 跨块实例贯穿同一文档渲染", () => {
  it("同 speaker 分配同侧，新 speaker 交替分配（镜像 dialog chat-bubbles 语义）", () => {
    registerBlock({
      id: "t166-speaker-probe",
      name: "T166 Speaker Probe",
      category: "text",
      directiveAttrs: z.object({ speaker: z.string().optional() }).strict(),
      variants: [{ id: "default" }],
      slots: ["root"],
      decorate: (element, ctx) => {
        const state = ctx.docState as {
          sides?: Record<string, "left" | "right">;
          next?: "left" | "right";
        };
        if (!state.sides) state.sides = {};
        if (!state.next) state.next = "left";
        const key = ctx.attrs.speaker ?? "";
        let side = state.sides[key];
        if (!side) {
          side = state.next;
          state.sides[key] = side;
          state.next = side === "left" ? "right" : "left";
        }
        element.properties = { ...element.properties, "data-t166-side": side };
      },
    });

    const markdown = [
      ':::t166-speaker-probe{speaker="甲"}',
      "第一句",
      ":::",
      "",
      ':::t166-speaker-probe{speaker="乙"}',
      "第二句",
      ":::",
      "",
      ':::t166-speaker-probe{speaker="甲"}',
      "第三句",
      ":::",
    ].join("\n");

    const mdast = parseMarkdown(markdown);
    const hast = transformToHast(mdast, []);
    const elements = findAllElementsByDataBlock(hast, "t166-speaker-probe");
    expect(elements.length).toBe(3);

    expect(elements[0]?.properties?.["data-t166-side"]).toBe("left");
    expect(elements[1]?.properties?.["data-t166-side"]).toBe("right");
    expect(elements[2]?.properties?.["data-t166-side"]).toBe("left");
  });
});

// ctx 内容契约: variant / attrs / docState
describe("ctx 内容契约: variant / attrs / docState", () => {
  it("decorate 收到的 ctx 携带当前 variant、声明属性透传值与文档级状态容器", () => {
    const capturedCtxs: BlockDecorateContext[] = [];
    registerBlock({
      id: "t166-ctx-probe",
      name: "T166 Ctx Probe",
      category: "text",
      directiveAttrs: z.object({ label: z.string().optional() }).strict(),
      variants: [{ id: "default" }, { id: "alt" }],
      slots: ["root"],
      decorate: (_element, ctx) => {
        capturedCtxs.push(ctx);
      },
    });

    const mdast = parseMarkdown(':::t166-ctx-probe{.alt label="hello"}\ncontent\n:::');
    transformToHast(mdast, []);

    expect(capturedCtxs.length).toBe(1);
    expect(capturedCtxs[0]?.variant).toBe("alt");
    expect(capturedCtxs[0]?.attrs.label).toBe("hello");
    expect(typeof capturedCtxs[0]?.docState).toBe("object");
    expect(capturedCtxs[0]?.docState).not.toBeNull();
  });
});
