import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { saveEditorPreferences, loadEditorPreferences } = vi.hoisted(() => ({
  saveEditorPreferences: vi.fn().mockResolvedValue(undefined),
  loadEditorPreferences: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@wechat-flow/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@wechat-flow/core")>();
  return {
    ...actual,
    saveEditorPreferences,
    loadEditorPreferences,
  };
});

import { usePreferencesStore } from "../preferences-store.ts";

beforeEach(() => {
  setActivePinia(createPinia());
  saveEditorPreferences.mockClear();
  loadEditorPreferences.mockClear();
  loadEditorPreferences.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AC-002: preferences-store 默认值", () => {
  it("inputAssist 默认 false（遵 orchestrator 漂移裁决，非 dev-plan 卡面笔误的 true）", () => {
    const store = usePreferencesStore();
    expect(store.inputAssist).toBe(false);
  });

  it("fontSize 默认 16", () => {
    const store = usePreferencesStore();
    expect(store.fontSize).toBe(16);
  });

  it("lineHeight 默认 1.75", () => {
    const store = usePreferencesStore();
    expect(store.lineHeight).toBe(1.75);
  });
});

describe("AC-003: updatePreferences 更新 ref 并持久化", () => {
  it("updatePreferences({ inputAssist: true }) 更新 store.inputAssist", async () => {
    const store = usePreferencesStore();
    await store.updatePreferences({ inputAssist: true });
    expect(store.inputAssist).toBe(true);
  });

  it("updatePreferences 调用 saveEditorPreferences 携带完整偏好对象", async () => {
    const store = usePreferencesStore();
    await store.updatePreferences({ fontSize: 18 });
    expect(saveEditorPreferences).toHaveBeenCalledWith({
      inputAssist: false,
      fontSize: 18,
      lineHeight: 1.75,
    });
  });

  it("updatePreferences 部分 patch 不影响未传字段", async () => {
    const store = usePreferencesStore();
    await store.updatePreferences({ inputAssist: true });
    await store.updatePreferences({ lineHeight: 2 });
    expect(store.inputAssist).toBe(true);
    expect(store.fontSize).toBe(16);
    expect(store.lineHeight).toBe(2);
  });
});

describe("AC-002/AC-003: init 从 loadEditorPreferences 回填", () => {
  it("init 时若存储中有值则覆盖默认值", async () => {
    loadEditorPreferences.mockResolvedValueOnce({
      inputAssist: true,
      fontSize: 14,
      lineHeight: 1.5,
    });
    const store = usePreferencesStore();
    await store.init();
    expect(store.inputAssist).toBe(true);
    expect(store.fontSize).toBe(14);
    expect(store.lineHeight).toBe(1.5);
  });

  it("init 时存储为 undefined 则保留默认值", async () => {
    loadEditorPreferences.mockResolvedValueOnce(undefined);
    const store = usePreferencesStore();
    await store.init();
    expect(store.inputAssist).toBe(false);
    expect(store.fontSize).toBe(16);
    expect(store.lineHeight).toBe(1.75);
  });

  it("init 时 loadEditorPreferences 抛错也不崩溃，保留默认值", async () => {
    loadEditorPreferences.mockRejectedValueOnce(new Error("db closed"));
    const store = usePreferencesStore();
    await expect(store.init()).resolves.toBeUndefined();
    expect(store.inputAssist).toBe(false);
    expect(store.fontSize).toBe(16);
    expect(store.lineHeight).toBe(1.75);
  });

  it("init 时部分字段类型不合法则该字段保留默认值", async () => {
    loadEditorPreferences.mockResolvedValueOnce({
      inputAssist: "yes" as unknown as boolean,
      fontSize: 20,
    });
    const store = usePreferencesStore();
    await store.init();
    expect(store.inputAssist).toBe(false);
    expect(store.fontSize).toBe(20);
    expect(store.lineHeight).toBe(1.75);
  });
});
