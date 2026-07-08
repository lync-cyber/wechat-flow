import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, getDb } from "./indexeddb-adapter.ts";
import {
  loadEditorPreferences,
  loadLeftPanelCollapsed,
  saveEditorPreferences,
  saveLeftPanelCollapsed,
} from "./preferences.ts";

async function clearAllPreferences(): Promise<void> {
  const db = await getDb();
  await db.clear("preferences");
}

beforeEach(async () => {
  await clearAllPreferences();
});

afterEach(async () => {
  await closeDb();
});

describe("AC-003: saveEditorPreferences round-trips via loadEditorPreferences", () => {
  it("save 后 load 返回相同的 inputAssist/fontSize/lineHeight", async () => {
    await saveEditorPreferences({ inputAssist: true, fontSize: 18, lineHeight: 2 });
    const loaded = await loadEditorPreferences();
    expect(loaded).toEqual({ inputAssist: true, fontSize: 18, lineHeight: 2 });
  });

  it("未保存时 loadEditorPreferences 返回 undefined", async () => {
    const loaded = await loadEditorPreferences();
    expect(loaded).toBeUndefined();
  });

  it("save 写入 preferences store 的 key 为 'editor'", async () => {
    await saveEditorPreferences({ inputAssist: false, fontSize: 16, lineHeight: 1.75 });
    const db = await getDb();
    const record = await db.get("preferences", "editor");
    expect(record).toBeDefined();
    expect(record?.key).toBe("editor");
    expect(record?.value).toEqual({ inputAssist: false, fontSize: 16, lineHeight: 1.75 });
  });

  it("closeDb 重开后 loadEditorPreferences 仍返回已保存值", async () => {
    await saveEditorPreferences({ inputAssist: true, fontSize: 14, lineHeight: 1.5 });
    await closeDb();
    const loaded = await loadEditorPreferences();
    expect(loaded).toEqual({ inputAssist: true, fontSize: 14, lineHeight: 1.5 });
  });

  it("重复 save 覆盖旧值而非追加", async () => {
    await saveEditorPreferences({ inputAssist: false, fontSize: 14, lineHeight: 1.5 });
    await saveEditorPreferences({ inputAssist: true, fontSize: 18, lineHeight: 2 });
    const loaded = await loadEditorPreferences();
    expect(loaded).toEqual({ inputAssist: true, fontSize: 18, lineHeight: 2 });
  });
});

describe("AC-003: saveLeftPanelCollapsed round-trips via loadLeftPanelCollapsed", () => {
  it("save(true) 后 load 返回 true", async () => {
    await saveLeftPanelCollapsed(true);
    const loaded = await loadLeftPanelCollapsed();
    expect(loaded).toBe(true);
  });

  it("save(false) 后 load 返回 false", async () => {
    await saveLeftPanelCollapsed(false);
    const loaded = await loadLeftPanelCollapsed();
    expect(loaded).toBe(false);
  });

  it("未保存时 loadLeftPanelCollapsed 返回 undefined", async () => {
    const loaded = await loadLeftPanelCollapsed();
    expect(loaded).toBeUndefined();
  });

  it("save 写入 preferences store 的 key 为 'leftPanelCollapsed'", async () => {
    await saveLeftPanelCollapsed(true);
    const db = await getDb();
    const record = await db.get("preferences", "leftPanelCollapsed");
    expect(record).toBeDefined();
    expect(record?.key).toBe("leftPanelCollapsed");
    expect(record?.value).toBe(true);
  });

  it("closeDb 重开后 loadLeftPanelCollapsed 仍返回已保存值", async () => {
    await saveLeftPanelCollapsed(true);
    await closeDb();
    const loaded = await loadLeftPanelCollapsed();
    expect(loaded).toBe(true);
  });

  it("重复 save 覆盖旧值", async () => {
    await saveLeftPanelCollapsed(true);
    await saveLeftPanelCollapsed(false);
    const loaded = await loadLeftPanelCollapsed();
    expect(loaded).toBe(false);
  });
});
