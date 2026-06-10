import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "../editor.ts";

describe("M-003 诊断流接线: store.lastReport 由真实渲染管线灌入", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("含 markdown 列表的内容渲染后 lastReport.nodeChangeRecords 含 transform-list-to-table", async () => {
    const store = useEditorStore();

    await store.updatePreview("- 第一项\n- 第二项");

    expect(store.lastReport.nodeChangeRecords.length).toBeGreaterThan(0);
    expect(
      store.lastReport.nodeChangeRecords.some((r) => r.triggerRuleId === "transform-list-to-table")
    ).toBe(true);
  });

  it("纯段落内容不触发规则, lastReport.nodeChangeRecords 为空", async () => {
    const store = useEditorStore();

    await store.updatePreview("普通段落文字");

    expect(store.lastReport.nodeChangeRecords).toHaveLength(0);
  });
});
