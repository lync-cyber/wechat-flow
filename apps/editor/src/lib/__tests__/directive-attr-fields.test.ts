import type { BlockDefinition } from "@wechat-flow/core";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { getDirectiveAttrFields } from "../directive-attr-fields.ts";

function makeBlock(directiveAttrs: BlockDefinition["directiveAttrs"]): BlockDefinition {
  return {
    id: "test-block",
    name: "测试块",
    category: "text",
    directiveAttrs,
    variants: [],
    slots: ["root"],
  };
}

describe("T-165 AC-003: getDirectiveAttrFields 从 directiveAttrs.shape 提取字段名", () => {
  it("单字段 schema 返回该字段名（pull-quote author 场景）", () => {
    const block = makeBlock(z.object({ author: z.string().optional() }).strict());
    expect(getDirectiveAttrFields(block)).toEqual(["author"]);
  });

  it("多字段 schema 按声明顺序返回全部字段名（dialog speaker/avatar 场景）", () => {
    const block = makeBlock(
      z.object({ speaker: z.string().optional(), avatar: z.string().optional() }).strict()
    );
    expect(getDirectiveAttrFields(block)).toEqual(["speaker", "avatar"]);
  });

  it("kebab-case 字段名原样返回（compare left-label 等场景）", () => {
    const block = makeBlock(
      z
        .object({
          "left-label": z.string().optional(),
          "left-value": z.string().optional(),
          "right-label": z.string().optional(),
          "right-value": z.string().optional(),
          title: z.string().optional(),
        })
        .strict()
    );
    expect(getDirectiveAttrFields(block)).toEqual([
      "left-label",
      "left-value",
      "right-label",
      "right-value",
      "title",
    ]);
  });

  it("空 shape（callout 场景）返回空数组", () => {
    const block = makeBlock(z.object({}).strict());
    expect(getDirectiveAttrFields(block)).toEqual([]);
  });

  it("directiveAttrs 非 ZodObject（无 shape 属性）时安全返回空数组，不抛异常", () => {
    const block = makeBlock(z.string() as unknown as BlockDefinition["directiveAttrs"]);
    expect(() => getDirectiveAttrFields(block)).not.toThrow();
    expect(getDirectiveAttrFields(block)).toEqual([]);
  });
});
