import { describe, expect, it } from "vitest";
import { composeApplyZhTypo } from "../../packages/core/src/index.ts";

describe("composeApplyZhTypo", () => {
  it("AC-001: returns fixed/perRule/totalChanges consistent with applyZhTypo, plus diff array", () => {
    const result = composeApplyZhTypo({ markdown: "这是GitHub的项目" });
    expect(typeof result.fixed).toBe("string");
    expect(result.fixed).toBe("这是 GitHub 的项目");
    expect(typeof result.totalChanges).toBe("number");
    expect(result.totalChanges).toBe(2);
    expect(typeof result.perRule).toBe("object");
    expect(result.perRule["zh-en-space"]).toBe(2);
    expect(Array.isArray(result.diff)).toBe(true);
  });

  it("AC-002: each DiffEntry has original, revised, ruleId; at least one entry with original≠revised and correct ruleId", () => {
    const result = composeApplyZhTypo({ markdown: "这是GitHub的项目" });
    expect(result.diff.length).toBeGreaterThan(0);
    for (const entry of result.diff) {
      expect(typeof entry.original).toBe("string");
      expect(typeof entry.revised).toBe("string");
      expect(typeof entry.ruleId).toBe("string");
      expect(["zh-en-space", "fullwidth-punctuation", "smart-quotes", "ellipsis-dash"]).toContain(
        entry.ruleId
      );
    }
    const zhEnSpaceEntry = result.diff.find((e) => e.ruleId === "zh-en-space");
    expect(zhEnSpaceEntry).toBeDefined();
    expect(zhEnSpaceEntry?.original).not.toBe(zhEnSpaceEntry?.revised);
  });

  it("AC-003: no-change input returns totalChanges=0 and diff=[]", () => {
    const result = composeApplyZhTypo({ markdown: "这是一段没有问题的中文" });
    expect(result.fixed).toBe("这是一段没有问题的中文");
    expect(result.totalChanges).toBe(0);
    expect(result.diff).toEqual([]);
  });

  it("R-002: rules filter is passed through — only requested rule fires", () => {
    const result = composeApplyZhTypo({ markdown: "这是GitHub的项目", rules: ["zh-en-space"] });
    expect(result.perRule["zh-en-space"]).toBeGreaterThanOrEqual(1);
    expect(result.perRule["smart-quotes"]).toBeUndefined();
    expect(result.perRule["fullwidth-punctuation"]).toBeUndefined();
    expect(result.perRule["ellipsis-dash"]).toBeUndefined();
    expect(result.fixed).toContain(" GitHub ");
  });
});
