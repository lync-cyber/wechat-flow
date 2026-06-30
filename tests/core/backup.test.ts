import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  createBackup,
  deleteDocument,
  duplicateDocument,
  listBackups,
  listDocuments,
  loadDocument,
  saveDraft,
} from "../../packages/core/src/index.ts";
import { closeDb } from "../../packages/core/src/storage/indexeddb-adapter.ts";

afterEach(async () => {
  await closeDb();
  indexedDB.deleteDatabase("wechat-flow-db");
});

describe("AC-001: listDocuments 返回含 size 字段的 DocumentMeta", () => {
  it("每条 DocumentMeta 包含 id / title / updatedAt / size 四个字段", async () => {
    await saveDraft({ id: "doc-1", title: "测试文档", content: "# Hello World", updatedAt: 1000 });
    const docs = await listDocuments();
    expect(docs).toHaveLength(1);
    const doc = docs[0];
    expect(doc).toBeDefined();
    expect(typeof doc?.id).toBe("string");
    expect(typeof doc?.title).toBe("string");
    expect(typeof doc?.updatedAt).toBe("number");
    expect(typeof doc?.size).toBe("number");
  });

  it("size 等于文档 content 的字节长度（TextEncoder.encode 长度）", async () => {
    const content = "# Hello";
    await saveDraft({ id: "doc-2", title: "Title", content, updatedAt: 2000 });
    const docs = await listDocuments();
    const doc = docs[0];
    expect(doc?.size).toBe(new TextEncoder().encode(content).length);
  });

  it("多个文档各自 size 正确", async () => {
    const c1 = "short";
    const c2 = "a longer content string here";
    await saveDraft({ id: "d1", title: "A", content: c1, updatedAt: 1000 });
    await saveDraft({ id: "d2", title: "B", content: c2, updatedAt: 2000 });
    const docs = await listDocuments();
    const d1 = docs.find((d) => d.id === "d1");
    const d2 = docs.find((d) => d.id === "d2");
    expect(d1?.size).toBe(new TextEncoder().encode(c1).length);
    expect(d2?.size).toBe(new TextEncoder().encode(c2).length);
  });
});

describe("AC-002: deleteDocument 级联删除 backups", () => {
  it("deleteDocument 后该文档的 backup 也被删除", async () => {
    await saveDraft({ id: "doc-3", title: "备份测试", content: "content", updatedAt: 3000 });
    await createBackup("doc-3");
    await createBackup("doc-3");
    const beforeDelete = await listBackups("doc-3");
    expect(beforeDelete).toHaveLength(2);

    await deleteDocument("doc-3");
    const afterDelete = await listBackups("doc-3");
    expect(afterDelete).toHaveLength(0);
  });

  it("deleteDocument 只删除对应 docId 的备份，不影响其他文档", async () => {
    await saveDraft({ id: "doc-a", title: "A", content: "a", updatedAt: 1000 });
    await saveDraft({ id: "doc-b", title: "B", content: "b", updatedAt: 2000 });
    await createBackup("doc-a");
    await createBackup("doc-b");

    await deleteDocument("doc-a");
    const backupsA = await listBackups("doc-a");
    const backupsB = await listBackups("doc-b");
    expect(backupsA).toHaveLength(0);
    expect(backupsB).toHaveLength(1);
  });
});

describe("AC-004 + AC-006: 备份保留策略——最多 5 份，超出删最旧", () => {
  it("连续 createBackup 5 次后恰好保留 5 份", async () => {
    await saveDraft({ id: "doc-r", title: "保留测试", content: "text", updatedAt: 1000 });
    for (let i = 0; i < 5; i++) {
      await createBackup("doc-r");
    }
    const backups = await listBackups("doc-r");
    expect(backups).toHaveLength(5);
  });

  it("第 6 次 createBackup 后仍只有 5 份", async () => {
    await saveDraft({ id: "doc-r2", title: "超限测试", content: "text", updatedAt: 1000 });
    for (let i = 0; i < 6; i++) {
      await createBackup("doc-r2");
    }
    const backups = await listBackups("doc-r2");
    expect(backups).toHaveLength(5);
  });

  it("第 6 次 createBackup 后最旧那份已被删除（AC-006）", async () => {
    await saveDraft({ id: "doc-r3", title: "最旧删除测试", content: "text", updatedAt: 1000 });
    const ids: string[] = [];
    for (let i = 0; i < 6; i++) {
      const id = await createBackup("doc-r3");
      ids.push(id);
    }
    const backups = await listBackups("doc-r3");
    const remainingIds = backups.map((b) => b.id);
    expect(remainingIds).not.toContain(ids[0]);
    expect(remainingIds).toContain(ids[5]);
  });
});

describe("createBackup: 文档不存在时抛出错误", () => {
  it("对不存在的 docId 调用 createBackup 应抛出错误", async () => {
    await expect(createBackup("nonexistent-doc")).rejects.toThrow();
  });
});

describe("duplicateDocument: 复制文档为新 id，title 追加副本", () => {
  it("duplicateDocument 返回新 id 且 loadDocument 可读取", async () => {
    await saveDraft({ id: "orig", title: "原始文档", content: "hello", updatedAt: 5000 });
    const newId = await duplicateDocument("orig");
    expect(typeof newId).toBe("string");
    expect(newId).not.toBe("orig");
    const copied = await loadDocument(newId);
    expect(copied).toBeDefined();
    expect(copied?.content).toBe("hello");
  });

  it("复制后 title 追加「副本」", async () => {
    await saveDraft({ id: "orig2", title: "我的文档", content: "body", updatedAt: 6000 });
    const newId = await duplicateDocument("orig2");
    const copied = await loadDocument(newId);
    expect(copied?.title).toBe("我的文档 副本");
  });

  it("原始文档在复制后仍存在", async () => {
    await saveDraft({ id: "orig3", title: "保留", content: "c", updatedAt: 7000 });
    await duplicateDocument("orig3");
    const orig = await loadDocument("orig3");
    expect(orig).toBeDefined();
    expect(orig?.title).toBe("保留");
  });
});
