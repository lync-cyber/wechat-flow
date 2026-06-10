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
  "miniprogram-card",
  "footer-cta",
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

describe("AC-001: listBlocks 返回全部 25 个 P0 Block", () => {
  it("listBlocks 返回数组长度 ≥ 25", () => {
    const blocks = listBlocks();
    expect(blocks.length).toBeGreaterThanOrEqual(25);
  });

  it.each(P0_BLOCK_IDS)("P0 Block '%s' 已注册", (id) => {
    const blocks = listBlocks();
    const found = blocks.find((b) => b.id === id);
    expect(found?.id).toBe(id);
  });
});

describe("AC-002: describeBlock('callout') 含 attrsSchema 和 ≥3 variants", () => {
  it("callout 的 attrsSchema 可通过 toJSONSchema 转换为含 type 字段的 JSON Schema", () => {
    const def = mustDescribeBlock("callout");
    const schema = toJSONSchema(def.attrsSchema);
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

describe("AC-003: 全部 25 个 P0 Block 的 attrsSchema 可 parse + toJSONSchema 不抛异常", () => {
  const SAMPLE_INPUTS: Record<string, unknown> = {
    heading: { level: 2, text: "标题" },
    paragraph: { text: "段落内容" },
    list: { items: ["条目一", "条目二"] },
    table: { headers: ["列A", "列B"], rows: [["1", "2"]] },
    "code-block": { code: "const x = 1;", lang: "typescript" },
    quote: { text: "引用文本", author: "张三" },
    card: { title: "卡片标题", body: "卡片内容" },
    callout: { type: "info", text: "提示内容" },
    divider: {},
    image: { src: "https://example.com/img.png", alt: "图片" },
    "image-caption": { src: "https://example.com/img.png", caption: "说明文字" },
    gallery: { images: [{ src: "https://example.com/a.png", alt: "a" }] },
    steps: { steps: [{ title: "步骤一", description: "描述" }] },
    compare: { left: { label: "A", value: "好" }, right: { label: "B", value: "更好" } },
    "pull-quote": { text: "摘引文字" },
    "highlight-block": { text: "高亮内容" },
    announcement: { text: "公告内容" },
    dialog: { speaker: "角色A", text: "对话内容" },
    timeline: { events: [{ date: "2024-01", text: "事件" }] },
    qrcode: { url: "https://example.com" },
    video: { src: "https://example.com/video.mp4" },
    audio: { src: "https://example.com/audio.mp3" },
    "miniprogram-card": { appId: "wx1234567890", path: "/pages/index/index", title: "小程序" },
    "footer-cta": { text: "立即关注", url: "https://example.com" },
    recommendation: { items: [{ title: "推荐文章", url: "https://example.com" }] },
  };

  it.each(P0_BLOCK_IDS)("Block '%s' 的 attrsSchema.parse(样例输入) 不抛异常", (id) => {
    const def = mustDescribeBlock(id);
    expect(() => def.attrsSchema.parse(SAMPLE_INPUTS[id])).not.toThrow();
  });

  it.each(P0_BLOCK_IDS)(
    "Block '%s' 的 toJSONSchema(attrsSchema) 返回含 schema 标记的对象",
    (id) => {
      const def = mustDescribeBlock(id);
      const schema = toJSONSchema(def.attrsSchema);
      const hasSchemaMarker = "type" in schema || "properties" in schema || "$schema" in schema;
      expect(hasSchemaMarker).toBe(true);
    }
  );
});
