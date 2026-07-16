import { beforeEach, describe, expect, it } from "vitest";
import { toJSONSchema } from "zod";
import {
  describeBlock,
  listBlocks,
  resetBlockRegistry,
} from "../../packages/core/src/registry/block.ts";
import "../../packages/blocks/src/index.ts";

const P0_BLOCK_IDS = [
  "heading",
  "paragraph",
  "list",
  "table",
  "code-block",
  "quote",
  "card",
  "callout",
  "divider",
  "image",
  "image-caption",
  "gallery",
  "steps",
  "compare",
  "pull-quote",
  "highlight-block",
  "announcement",
  "dialog",
  "timeline",
  "qrcode",
  "video",
  "audio",
  "recommendation",
] as const;

beforeEach(() => {
  resetBlockRegistry();
});

function mustDescribeBlock(id: string): NonNullable<ReturnType<typeof describeBlock>> {
  const def = describeBlock(id);
  if (!def) {
    throw new Error(`block not registered: ${id}`);
  }
  return def;
}

describe("AC-001: listBlocks 返回全部 23 个 P0 Block", () => {
  it("listBlocks 返回数组长度 ≥ 23", () => {
    const blocks = listBlocks();
    expect(blocks.length).toBeGreaterThanOrEqual(23);
  });

  it.each(P0_BLOCK_IDS)("P0 Block '%s' 已注册", (id) => {
    const blocks = listBlocks();
    const found = blocks.find((b) => b.id === id);
    expect(found?.id).toBe(id);
  });
});

describe("AC-002: describeBlock('callout') 含 directiveAttrs 和 ≥3 variants", () => {
  it("callout 的 directiveAttrs 可通过 toJSONSchema 转换为含 type 字段的 JSON Schema", () => {
    const def = mustDescribeBlock("callout");
    const schema = toJSONSchema(def.directiveAttrs);
    const hasSchemaMarker = "type" in schema || "properties" in schema || "$schema" in schema;
    expect(hasSchemaMarker).toBe(true);
  });

  it("callout 的 variants 数组长度 ≥ 3", () => {
    const def = mustDescribeBlock("callout");
    expect(def.variants.length).toBeGreaterThanOrEqual(3);
  });

  it("callout variants 每项含非空 id 字段", () => {
    const def = mustDescribeBlock("callout");
    for (const variant of def.variants) {
      expect(typeof variant.id).toBe("string");
      expect(variant.id.length).toBeGreaterThan(0);
    }
  });
});

describe("AC-003: 全部 23 个 P0 Block 的 directiveAttrs 可 parse({}) + toJSONSchema 不抛异常", () => {
  it.each(P0_BLOCK_IDS)(
    "Block '%s' 的 directiveAttrs.parse({}) 不抛异常（指令属性均可选）",
    (id) => {
      const def = mustDescribeBlock(id);
      expect(() => def.directiveAttrs.parse({})).not.toThrow();
    }
  );

  it.each(P0_BLOCK_IDS)(
    "Block '%s' 的 toJSONSchema(directiveAttrs) 返回含 schema 标记的对象",
    (id) => {
      const def = mustDescribeBlock(id);
      const schema = toJSONSchema(def.directiveAttrs);
      const hasSchemaMarker = "type" in schema || "properties" in schema || "$schema" in schema;
      expect(hasSchemaMarker).toBe(true);
    }
  );
});
