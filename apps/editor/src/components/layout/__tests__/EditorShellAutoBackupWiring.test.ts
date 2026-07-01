import "fake-indexeddb/auto";
import { mount } from "@vue/test-utils";
import { closeDb } from "@wechat-flow/core";
import { createPinia } from "pinia";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import type { UseAutoBackupOptions } from "../../../composables/use-auto-backup.ts";
import EditorShell from "../EditorShell.vue";

let capturedOpts: UseAutoBackupOptions | null = null;

vi.mock("../../../composables/use-auto-backup.ts", () => ({
  BACKUP_INTERVAL_MS: 5 * 60 * 1000,
  useAutoBackup: vi.fn((opts: UseAutoBackupOptions) => {
    capturedOpts = opts;
  }),
}));

vi.mock("../../../use-cases/render.ts", () => ({
  composeRender: vi.fn().mockResolvedValue({
    html: "<p>test</p>",
    diagnostics: [],
    postPaste: false,
    coreVersion: "0.0.0",
    themeVersion: "0.0.0",
    rulesetVersion: "0.0.0",
    nodeLocations: [],
    versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
    report: {
      diagnostics: [],
      nodeChangeRecords: [],
      nightRiskIssues: [],
      versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
    },
  }),
}));

import { useAutoBackup } from "../../../composables/use-auto-backup.ts";

afterEach(async () => {
  await closeDb();
  indexedDB.deleteDatabase("wechat-flow-db");
  capturedOpts = null;
  vi.clearAllMocks();
});

describe("AC-001: EditorShell 挂载时接线 useAutoBackup", () => {
  it("useAutoBackup 被调用恰好 1 次，getDocId() 返回 editorStore.currentDocId", async () => {
    const mockUseAutoBackup = vi.mocked(useAutoBackup);

    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    expect(mockUseAutoBackup).toHaveBeenCalledOnce();
    expect(capturedOpts).not.toBeNull();
    expect(capturedOpts?.getDocId()).toBe("draft-default");

    wrapper.unmount();
  });
});

describe("AC-002: dirty 语义 — 内容变更置脏，备份成功清脏", () => {
  it("初始 isDirty()=false；内容变更后 true；onBackedUp() 后回到 false", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    expect(capturedOpts).not.toBeNull();
    expect(capturedOpts?.isDirty()).toBe(false);

    const sourcePane = wrapper.findComponent({ name: "SourcePane" });
    expect(sourcePane.exists()).toBe(true);
    const onValueChange = sourcePane.props("onValueChange") as (value: string) => void;
    onValueChange("# X");
    await nextTick();

    expect(capturedOpts?.isDirty()).toBe(true);

    capturedOpts?.onBackedUp?.();
    await nextTick();

    expect(capturedOpts?.isDirty()).toBe(false);

    wrapper.unmount();
  });
});

describe("AC-003: 无回归 — SourcePane 内容变更仍落到 editorStore.setContent", () => {
  it("onValueChange 触发后 editorStore.content 更新", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const sourcePane = wrapper.findComponent({ name: "SourcePane" });
    const onValueChange = sourcePane.props("onValueChange") as (value: string) => void;
    onValueChange("# Hello Regression");
    await nextTick();

    expect(sourcePane.props("modelValue")).toBe("# Hello Regression");

    wrapper.unmount();
  });
});
