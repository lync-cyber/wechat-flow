import { beforeEach, describe, expect, it } from "vitest";
import { toJSONSchema } from "zod";
import {
  describeBlock,
  listBlocks,
  resetBlockRegistry,
} from "../../packages/core/src/registry/block.ts";
import "../../packages/blocks/src/index.ts";

const P1_BLOCK_IDS = ["author-card", "publication-skeleton", "kpi-card", "qa", "footnote"] as const;

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

describe("AC-001: listBlocks 长度 ≥ 30，5 个新 ID 全部注册", () => {
  it("listBlocks 返回数组长度 ≥ 30", () => {
    const blocks = listBlocks();
    expect(blocks.length).toBeGreaterThanOrEqual(30);
  });

  it.each(P1_BLOCK_IDS)("P1 Block '%s' 已注册", (id) => {
    const blocks = listBlocks();
    const found = blocks.find((b) => b.id === id);
    expect(found?.id).toBe(id);
  });
});

describe("AC-002: 每新增 Block 注册 ≥ 2 variant，directiveAttrs Zod parse 无异常", () => {
  it.each(P1_BLOCK_IDS)("Block '%s' variants 数量 ≥ 2", (id) => {
    const def = mustDescribeBlock(id);
    expect(def.variants.length).toBeGreaterThanOrEqual(2);
  });

  it.each(P1_BLOCK_IDS)("Block '%s' variants 每项 id 非空字符串", (id) => {
    const def = mustDescribeBlock(id);
    for (const variant of def.variants) {
      expect(typeof variant.id).toBe("string");
      expect(variant.id.length).toBeGreaterThan(0);
    }
  });

  it.each(P1_BLOCK_IDS)("Block '%s' directiveAttrs.parse({}) 不抛异常（指令属性均可选）", (id) => {
    const def = mustDescribeBlock(id);
    expect(() => def.directiveAttrs.parse({})).not.toThrow();
  });

  it.each(P1_BLOCK_IDS)(
    "Block '%s' toJSONSchema(directiveAttrs) 返回含 schema 标记的对象",
    (id) => {
      const def = mustDescribeBlock(id);
      const schema = toJSONSchema(def.directiveAttrs);
      const hasSchemaMarker = "type" in schema || "properties" in schema || "$schema" in schema;
      expect(hasSchemaMarker).toBe(true);
    }
  );
});

describe("AC-003: 5 套主题对新 Block 提供基础 CSS（baseStyle.root 存在）", () => {
  it.each(P1_BLOCK_IDS)("Block '%s' 的 baseStyle.root 含至少一条 CSS 属性", (id) => {
    const def = mustDescribeBlock(id);
    expect(def.baseStyle).toBeDefined();
    expect(def.baseStyle?.root).toBeDefined();
    const rootEntries = Object.entries(def.baseStyle?.root ?? {});
    expect(rootEntries.length).toBeGreaterThanOrEqual(1);
  });

  it.each(P1_BLOCK_IDS)("Block '%s' 的 slots 含 'root'", (id) => {
    const def = mustDescribeBlock(id);
    expect(def.slots).toContain("root");
  });
});
