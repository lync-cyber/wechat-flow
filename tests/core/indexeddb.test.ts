import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  deleteDocument,
  listDocuments,
  loadDocument,
  saveDraft,
} from "../../packages/core/src/documents/manager.ts";
import { closeDb } from "../../packages/core/src/storage/indexeddb-adapter.ts";
import {
  loadSplitterWidth,
  saveSplitterWidth,
} from "../../packages/core/src/storage/preferences.ts";

afterEach(async () => {
  await closeDb();
  indexedDB.deleteDatabase("wechat-flow-db");
});

describe("AC-001: saveDraft / loadDocument 往返一致", () => {
  it("saveDraft 写入后 loadDocument 返回相同数据", async () => {
    const ts = Date.now();
    await saveDraft({ id: "doc-1", title: "测试", content: "# Hello", updatedAt: ts });
    const doc = await loadDocument("doc-1");
    expect(doc).not.toBeUndefined();
    expect(doc?.id).toBe("doc-1");
    expect(doc?.title).toBe("测试");
    expect(doc?.content).toBe("# Hello");
    expect(doc?.updatedAt).toBe(ts);
  });
});

describe("AC-002: listDocuments 返回降序排列", () => {
  it("listDocuments 返回所有文档元数据且按 updatedAt 降序", async () => {
    const t1 = 1000;
    const t2 = 2000;
    await saveDraft({ id: "doc-a", title: "A", content: "a", updatedAt: t1 });
    await saveDraft({ id: "doc-b", title: "B", content: "b", updatedAt: t2 });
    const docs = await listDocuments();
    expect(docs.length).toBe(2);
    expect(docs[0]?.id).toBe("doc-b");
    expect(docs[1]?.id).toBe("doc-a");
    for (const d of docs) {
      expect(Object.keys(d)).toEqual(expect.arrayContaining(["id", "title", "updatedAt"]));
      expect("content" in d).toBe(false);
    }
  });
});

describe("AC-003: Splitter 宽度持久化", () => {
  it("saveSplitterWidth 后 loadSplitterWidth 返回相同宽度", async () => {
    await saveSplitterWidth("left-panel", 240);
    const width = await loadSplitterWidth("left-panel");
    expect(width).toBe(240);
  });

  it("loadSplitterWidth 对不存在的 key 返回 undefined", async () => {
    const width = await loadSplitterWidth("nonexistent-panel");
    expect(width).toBeUndefined();
  });
});

describe("AC-004: deleteDocument 后 loadDocument 返回 undefined", () => {
  it("deleteDocument 后 loadDocument 返回 undefined", async () => {
    const ts = Date.now();
    await saveDraft({ id: "doc-1", title: "测试", content: "# Hello", updatedAt: ts });
    await deleteDocument("doc-1");
    const doc = await loadDocument("doc-1");
    expect(doc).toBeUndefined();
  });
});
