import { beforeEach, describe, expect, it } from "vitest";
import {
  describeBlock,
  listBlocks,
  resetBlockRegistry,
  resetVariantRegistry,
} from "../../../packages/core/src/index.ts";
import "../../../packages/blocks/src/index.ts";

beforeEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
});

const registeredBlockIds = listBlocks().map((block) => block.id);

describe("AC-001a: 全部内置 Block directiveAttrs 为可用 zod schema 且空对象通过校验", () => {
  it.each(registeredBlockIds)(
    "%s 的 directiveAttrs.safeParse({}) 校验通过（全部指令属性均可选）",
    (blockId) => {
      const definition = describeBlock(blockId);
      expect(definition).toBeDefined();
      const result = definition?.directiveAttrs.safeParse({});
      expect(result?.success).toBe(true);
    }
  );
});

describe("AC-001b: pull-quote/dialog/compare 各自声明的 directiveAttrs 属性集合", () => {
  it("pull-quote directiveAttrs 接受合法 author、接受空对象，拒绝类型错误与结构化域字段 text", () => {
    const definition = describeBlock("pull-quote");
    expect(definition).toBeDefined();
    expect(definition?.directiveAttrs.safeParse({ author: "鲁迅" }).success).toBe(true);
    expect(definition?.directiveAttrs.safeParse({}).success).toBe(true);
    expect(definition?.directiveAttrs.safeParse({ author: 123 }).success).toBe(false);
    expect(definition?.directiveAttrs.safeParse({ text: "x" }).success).toBe(false);
  });

  it("dialog directiveAttrs 接受合法 speaker/avatar、接受空对象，拒绝类型错误与结构化域字段 text", () => {
    const definition = describeBlock("dialog");
    expect(definition).toBeDefined();
    expect(definition?.directiveAttrs.safeParse({ speaker: "甲" }).success).toBe(true);
    expect(
      definition?.directiveAttrs.safeParse({ speaker: "甲", avatar: "https://x.test/a.png" })
        .success
    ).toBe(true);
    expect(definition?.directiveAttrs.safeParse({}).success).toBe(true);
    expect(definition?.directiveAttrs.safeParse({ speaker: 1 }).success).toBe(false);
    expect(definition?.directiveAttrs.safeParse({ text: "你好" }).success).toBe(false);
  });

  it("compare directiveAttrs 接受五个合法 kebab 键、接受空对象，拒绝结构化域字段 left", () => {
    const definition = describeBlock("compare");
    expect(definition).toBeDefined();
    expect(
      definition?.directiveAttrs.safeParse({
        "left-label": "优点",
        "left-value": "轻量",
        "right-label": "缺点",
        "right-value": "偏贵",
        title: "对比标题",
      }).success
    ).toBe(true);
    expect(definition?.directiveAttrs.safeParse({}).success).toBe(true);
    expect(definition?.directiveAttrs.safeParse({ left: { label: "x", value: "y" } }).success).toBe(
      false
    );
  });
});

describe("AC-001c: 无声明属性的 Block directiveAttrs 为空 strict object，拒绝任意指令属性", () => {
  it.each(["callout", "quote", "paragraph", "gallery"])(
    "%s directiveAttrs 接受空对象但拒绝任意结构化域字段（text / steps）",
    (blockId) => {
      const definition = describeBlock(blockId);
      expect(definition).toBeDefined();
      expect(definition?.directiveAttrs.safeParse({}).success).toBe(true);
      expect(definition?.directiveAttrs.safeParse({ text: "x" }).success).toBe(false);
      expect(definition?.directiveAttrs.safeParse({ steps: [] }).success).toBe(false);
    }
  );
});

describe("AC-001d: describeBlock 返回的定义对象不再携带结构化 attrsSchema 字段", () => {
  it("describeBlock('callout') 返回对象不含 attrsSchema key", () => {
    const definition = describeBlock("callout");
    expect(definition).toBeDefined();
    expect(Object.hasOwn(definition as object, "attrsSchema")).toBe(false);
  });
});
