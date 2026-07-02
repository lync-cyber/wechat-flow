import "fake-indexeddb/auto";
import { closeDb, listDocuments } from "@wechat-flow/core";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "../editor.ts";

describe("loadDraft(): 空库首启接线 ensureDemoDocument", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(async () => {
    await closeDb();
    indexedDB.deleteDatabase("wechat-flow-db");
  });

  it("AC-004 空库首启调用 loadDraft() 后 store.content 与 store.previewHtml 均为非空 demo 内容", async () => {
    expect(await listDocuments()).toHaveLength(0);
    const store = useEditorStore();

    await store.loadDraft();

    expect(store.content.length).toBeGreaterThan(0);
    expect(store.content).toMatch(/^#\s+/m);
    expect(store.previewHtml.length).toBeGreaterThan(0);
  });
});
