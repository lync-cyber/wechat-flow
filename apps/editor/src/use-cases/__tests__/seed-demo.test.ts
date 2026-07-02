import "fake-indexeddb/auto";
import { closeDb, listDocuments, loadDocument, saveDraft } from "@wechat-flow/core";
import { afterEach, describe, expect, it } from "vitest";
import { DEMO_DOC_ID, ensureDemoDocument } from "../seed-demo.ts";

afterEach(async () => {
  await closeDb();
  indexedDB.deleteDatabase("wechat-flow-db");
});

describe("ensureDemoDocument", () => {
  it("AC-001 空库时播种一篇中文示例文档，标题非 Untitled 且内容含代表性结构", async () => {
    expect(await listDocuments()).toHaveLength(0);

    await ensureDemoDocument();

    const record = await loadDocument(DEMO_DOC_ID);
    expect(record).toBeDefined();
    expect(record?.title).not.toBe("Untitled");
    expect(record?.title).toMatch(/[一-龥]/);
    expect(record?.content.length).toBeGreaterThan(0);
    expect(record?.content).toMatch(/^#\s+/m);
    expect(record?.content).toMatch(/^##\s+/m);
    expect(record?.content).toMatch(/^>\s+/m);
  });

  it("AC-002 库已有任意文档（id 非 draft-default）时不播种，文档数量与内容不变", async () => {
    await saveDraft({
      id: "user-doc-1",
      title: "用户已有文档",
      content: "# 用户内容",
      updatedAt: 500,
    });
    const before = await listDocuments();
    expect(before).toHaveLength(1);

    await ensureDemoDocument();

    const after = await listDocuments();
    expect(after).toHaveLength(1);
    expect(after[0]?.id).toBe("user-doc-1");
    const demoRecord = await loadDocument(DEMO_DOC_ID);
    expect(demoRecord).toBeUndefined();
  });

  it("AC-003 幂等：重复调用不重复写入，第二次调用后 updatedAt 与文档数保持不变", async () => {
    await ensureDemoDocument();
    const firstRecord = await loadDocument(DEMO_DOC_ID);
    const firstUpdatedAt = firstRecord?.updatedAt;
    const firstCount = (await listDocuments()).length;

    await ensureDemoDocument();

    const secondRecord = await loadDocument(DEMO_DOC_ID);
    expect(secondRecord?.updatedAt).toBe(firstUpdatedAt);
    expect((await listDocuments()).length).toBe(firstCount);
  });
});
