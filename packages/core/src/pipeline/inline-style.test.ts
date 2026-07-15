import type { Element, Root as HastRoot } from "hast";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { registerBlock, resetBlockRegistry } from "../registry/block.ts";
import { resetVariantRegistry } from "../registry/variant.ts";
import { inlineStyle } from "./inline-style.ts";

afterEach(() => {
  resetBlockRegistry();
  resetVariantRegistry();
});

function buildProbeSlotHast(blockId: string, variantId: string): HastRoot {
  return {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "section",
        properties: { "data-block": blockId, "data-variant": variantId },
        children: [
          {
            type: "element",
            tagName: "section",
            properties: { "data-block-slot": "title" },
            children: [{ type: "text", value: "标题文本" }],
          },
        ],
      },
    ],
  };
}

function titleSlotStyle(hast: HastRoot): string {
  const container = hast.children[0] as Element;
  const slot = container.children[0] as Element;
  return typeof slot.properties?.style === "string" ? slot.properties.style : "";
}

describe("T-190 AC-003: getBlockSlotStyle merge semantics（块基线 slot ⊕ 变体 slot delta）", () => {
  it("互不重叠键时块级 title slot baseStyle 与变体 title slot delta 合并共存", () => {
    registerBlock({
      id: "probe-slot-merge",
      name: "Probe Slot Merge",
      category: "text",
      directiveAttrs: z.object({}),
      variants: [{ id: "highlighted", baseStyle: { root: {}, title: { color: "#333" } } }],
      baseStyle: { root: {}, title: { "font-weight": "600" } },
      slots: ["root", "title"],
    });

    const style = titleSlotStyle(
      inlineStyle(buildProbeSlotHast("probe-slot-merge", "highlighted"))
    );

    expect(style).toContain("font-weight: 600");
    expect(style).toContain("color: #333");
  });

  it("同键碰撞时变体 title slot delta 值覆盖块级 title slot 值，非重叠键仍保留", () => {
    registerBlock({
      id: "probe-slot-override",
      name: "Probe Slot Override",
      category: "text",
      directiveAttrs: z.object({}),
      variants: [{ id: "highlighted", baseStyle: { root: {}, title: { padding: "8px" } } }],
      baseStyle: { root: {}, title: { padding: "4px", "font-weight": "600" } },
      slots: ["root", "title"],
    });

    const style = titleSlotStyle(
      inlineStyle(buildProbeSlotHast("probe-slot-override", "highlighted"))
    );

    expect(style).toContain("padding: 8px");
    expect(style).not.toContain("padding: 4px");
    expect(style).toContain("font-weight: 600");
  });
});
