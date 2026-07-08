import type { Element } from "hast";
import { describe, expect, it } from "vitest";
import { slotElement } from "../../packages/blocks/src/decorate-utils.ts";

describe("AC-003: slotElement 槽位工厂函数", () => {
  it("默认（无 opts）产出 section 标签，properties 含 data-block-slot，且保留传入 children", () => {
    const children: Element["children"] = [{ type: "text", value: "示例文本" }];
    const el = slotElement("caption", children);
    expect(el.tagName).toBe("section");
    expect(el.properties?.["data-block-slot"]).toBe("caption");
    expect(el.children).toEqual(children);
  });

  it("不同 slot 名分别反映在各自产出的 data-block-slot 属性值中", () => {
    const rowEl = slotElement("row", []);
    const titleEl = slotElement("title", []);
    expect(rowEl.properties?.["data-block-slot"]).toBe("row");
    expect(titleEl.properties?.["data-block-slot"]).toBe("title");
    expect(rowEl.tagName).toBe("section");
    expect(titleEl.tagName).toBe("section");
  });

  it("opts.inline=true 时产出 span 标签而非 section", () => {
    const children: Element["children"] = [{ type: "text", value: "「" }];
    const el = slotElement("quote-mark", children, { inline: true });
    expect(el.tagName).toBe("span");
    expect(el.properties?.["data-block-slot"]).toBe("quote-mark");
  });

  it("省略 inline 或 inline=false 时仍产出 section（块级默认）", () => {
    const el = slotElement("author", [{ type: "text", value: "—— 作者" }], { inline: false });
    expect(el.tagName).toBe("section");
  });

  it("opts.props 合入 properties，且不覆盖 data-block-slot 语义", () => {
    const children: Element["children"] = [{ type: "text", value: "内容" }];
    const el = slotElement("cell", children, {
      props: { "data-testid": "cell-1", width: "50%" },
    });
    expect(el.properties?.["data-testid"]).toBe("cell-1");
    expect(el.properties?.width).toBe("50%");
    expect(el.properties?.["data-block-slot"]).toBe("cell");
  });
});
