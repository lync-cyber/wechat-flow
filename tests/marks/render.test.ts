import { beforeEach, describe, expect, it } from "vitest";
import {
  describeMark,
  listMarks,
  resetMarkRegistry,
} from "../../packages/core/src/registry/mark.ts";
import { renderMarkdown } from "../../packages/core/src/render.ts";
import "../../packages/marks/src/index.ts";

const REQUIRED_MARK_IDS = [
  "badge",
  "emphasis",
  "highlight",
  "underline",
  "wavy",
  "insert",
  "sup",
  "sub",
] as const;

beforeEach(() => {
  resetMarkRegistry();
  // re-import side-effect registration after reset
});

function mustDescribeMark(id: string): NonNullable<ReturnType<typeof describeMark>> {
  const def = describeMark(id);
  if (!def) {
    throw new Error(`mark not registered: ${id}`);
  }
  return def;
}

describe("AC-001: listMarks 返回 ≥11 个 Mark，含 8 个必须 ID", () => {
  it("listMarks 返回数组长度 ≥ 11", () => {
    const marks = listMarks();
    expect(marks.length).toBeGreaterThanOrEqual(11);
  });

  it.each(REQUIRED_MARK_IDS)("必须 Mark '%s' 已注册", (id) => {
    const marks = listMarks();
    const found = marks.find((m) => m.id === id);
    expect(found?.id).toBe(id);
  });

  it("每个 Mark 含非空 id 和 name 字段", () => {
    const marks = listMarks();
    for (const mark of marks) {
      expect(typeof mark.id).toBe("string");
      expect(mark.id.length).toBeGreaterThan(0);
      expect(typeof mark.name).toBe("string");
      expect(mark.name.length).toBeGreaterThan(0);
    }
  });

  it("每个 Mark 含非空 style 字段（CSS 字符串）", () => {
    const marks = listMarks();
    for (const mark of marks) {
      expect(typeof mark.style).toBe("string");
      expect((mark.style as string).length).toBeGreaterThan(0);
    }
  });
});

describe("AC-002: :badge[新]{type=hot} 经 renderMarkdown 产出 inline-styled span，无 class", () => {
  it("产出 HTML 含 <span 元素", async () => {
    const result = await renderMarkdown(":badge[新]{type=hot}", { rules: [] });
    expect(result.html).toMatch(/<span/);
  });

  it("span 元素含 style 属性", async () => {
    const result = await renderMarkdown(":badge[新]{type=hot}", { rules: [] });
    expect(result.html).toMatch(/<span[^>]+style="/);
  });

  it("span 元素内容含文字「新」", async () => {
    const result = await renderMarkdown(":badge[新]{type=hot}", { rules: [] });
    expect(result.html).toContain("新");
  });

  it("span 元素不含 class 属性", async () => {
    const result = await renderMarkdown(":badge[新]{type=hot}", { rules: [] });
    const spanMatch = result.html.match(/<span[^>]*>/);
    expect(spanMatch).not.toBeNull();
    if (spanMatch) {
      expect(spanMatch[0]).not.toContain("class=");
    }
  });
});
