import "fake-indexeddb/auto";
import { flushPromises, mount } from "@vue/test-utils";
import { closeDb, saveDraft } from "@wechat-flow/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import DocumentListSheet from "../DocumentListSheet.vue";

beforeEach(async () => {
  await saveDraft({
    id: "integ-doc-alpha",
    title: "集成测试文档甲",
    content: "# 甲",
    updatedAt: 2000,
  });
  await saveDraft({
    id: "integ-doc-beta",
    title: "集成测试文档乙",
    content: "# 乙",
    updatedAt: 1000,
  });
});

afterEach(async () => {
  await closeDb();
  indexedDB.deleteDatabase("wechat-flow-db");
});

describe("DocumentListSheet 集成：经真实 listDocuments 路径渲染已持久化文档", () => {
  it("open=true 时渲染 saveDraft 写入的文档标题（未经 vi.mock 旁路）", async () => {
    const wrapper = mount(DocumentListSheet, {
      props: { open: true },
      attachTo: document.body,
    });
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain("集成测试文档甲");
    expect(text).toContain("集成测试文档乙");

    wrapper.unmount();
  });

  it("文档项数量与 saveDraft seed 数量一致", async () => {
    const wrapper = mount(DocumentListSheet, {
      props: { open: true },
      attachTo: document.body,
    });
    await flushPromises();

    const items = wrapper.findAll('[data-testid^="doc-item-"]');
    expect(items.length).toBe(2);

    wrapper.unmount();
  });
});
