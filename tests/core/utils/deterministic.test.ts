import { describe, expect, it } from "vitest";
import {
  canonicalStringify,
  sortedEntries,
  sortedKeys,
  sortedSet,
} from "../../../packages/core/src/utils/deterministic.ts";

describe("deterministic utils — 确定性排序与规范化", () => {
  it("sortedKeys 按字典序返回对象键（与插入顺序无关）", () => {
    expect(sortedKeys({ b: 1, a: 2, c: 3 })).toEqual(["a", "b", "c"]);
    expect(sortedKeys({ c: 1, a: 2 })).toEqual(["a", "c"]);
  });

  it("sortedEntries 按键字典序返回 [key, value] 条目", () => {
    expect(sortedEntries({ b: 2, a: 1 })).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
  });

  it("sortedSet 按字典序返回集合元素（字符串与数字）", () => {
    expect(sortedSet(new Set(["c", "a", "b"]))).toEqual(["a", "b", "c"]);
    expect(sortedSet(new Set([3, 1, 2]))).toEqual([1, 2, 3]);
  });

  describe("canonicalStringify", () => {
    it("基本类型与 null 走 JSON.stringify", () => {
      expect(canonicalStringify(42)).toBe("42");
      expect(canonicalStringify("x")).toBe('"x"');
      expect(canonicalStringify(null)).toBe("null");
      expect(canonicalStringify(true)).toBe("true");
    });

    it("数组递归序列化并保持顺序", () => {
      expect(canonicalStringify([3, 1, 2])).toBe("[3,1,2]");
      expect(canonicalStringify([{ b: 1, a: 2 }])).toBe('[{"a":2,"b":1}]');
    });

    it("对象按键字典序序列化（输出与插入顺序无关）", () => {
      expect(canonicalStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
      expect(canonicalStringify({ b: 1, a: 2 })).toBe(canonicalStringify({ a: 2, b: 1 }));
    });

    it("嵌套对象/数组深度规范化", () => {
      expect(canonicalStringify({ z: [1, { y: 2, x: 3 }], a: "k" })).toBe(
        '{"a":"k","z":[1,{"x":3,"y":2}]}'
      );
    });
  });
});
