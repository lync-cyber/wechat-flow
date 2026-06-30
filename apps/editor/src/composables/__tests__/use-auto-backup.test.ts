import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

vi.mock("@wechat-flow/core", () => ({
  createBackup: vi.fn().mockResolvedValue("backup-id-123"),
}));

import { createBackup } from "@wechat-flow/core";
import { BACKUP_INTERVAL_MS, useAutoBackup } from "../use-auto-backup.ts";

describe("BACKUP_INTERVAL_MS 常量", () => {
  it("BACKUP_INTERVAL_MS 等于 5 分钟（300000ms）", () => {
    expect(BACKUP_INTERVAL_MS).toBe(5 * 60 * 1000);
  });
});

describe("AC-003: 自动备份触发条件", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(createBackup).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("isDirty=true 且经过 5 分钟后触发 createBackup", async () => {
    const TestComp = defineComponent({
      setup() {
        useAutoBackup({
          getDocId: () => "doc-test",
          isDirty: () => true,
          intervalMs: BACKUP_INTERVAL_MS,
        });
        return () => h("div");
      },
    });

    const wrapper = mount(TestComp, { attachTo: document.body });

    await vi.advanceTimersByTimeAsync(BACKUP_INTERVAL_MS);

    expect(createBackup).toHaveBeenCalledWith("doc-test");
    wrapper.unmount();
  });

  it("isDirty=false 时不触发 createBackup", async () => {
    const TestComp = defineComponent({
      setup() {
        useAutoBackup({
          getDocId: () => "doc-nodirty",
          isDirty: () => false,
          intervalMs: BACKUP_INTERVAL_MS,
        });
        return () => h("div");
      },
    });

    const wrapper = mount(TestComp, { attachTo: document.body });

    await vi.advanceTimersByTimeAsync(BACKUP_INTERVAL_MS);

    expect(createBackup).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("触发后调用 onBackedUp 回调", async () => {
    const onBackedUp = vi.fn();

    const TestComp = defineComponent({
      setup() {
        useAutoBackup({
          getDocId: () => "doc-cb",
          isDirty: () => true,
          intervalMs: BACKUP_INTERVAL_MS,
          onBackedUp,
        });
        return () => h("div");
      },
    });

    const wrapper = mount(TestComp, { attachTo: document.body });

    await vi.advanceTimersByTimeAsync(BACKUP_INTERVAL_MS);

    expect(onBackedUp).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});

describe("AC-005: onUnmounted 时 clearInterval，卸载后不再触发", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(createBackup).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("组件卸载后推进时间不再触发 createBackup", async () => {
    const TestComp = defineComponent({
      setup() {
        useAutoBackup({
          getDocId: () => "doc-unmount",
          isDirty: () => true,
          intervalMs: BACKUP_INTERVAL_MS,
        });
        return () => h("div");
      },
    });

    const wrapper = mount(TestComp, { attachTo: document.body });

    await vi.advanceTimersByTimeAsync(1000);
    expect(createBackup).not.toHaveBeenCalled();

    wrapper.unmount();

    await vi.advanceTimersByTimeAsync(BACKUP_INTERVAL_MS);

    expect(createBackup).not.toHaveBeenCalled();
  });

  it("组件卸载前能触发，卸载后不再触发第二次", async () => {
    const TestComp = defineComponent({
      setup() {
        useAutoBackup({
          getDocId: () => "doc-once",
          isDirty: () => true,
          intervalMs: BACKUP_INTERVAL_MS,
        });
        return () => h("div");
      },
    });

    const wrapper = mount(TestComp, { attachTo: document.body });

    await vi.advanceTimersByTimeAsync(BACKUP_INTERVAL_MS);
    expect(createBackup).toHaveBeenCalledTimes(1);

    wrapper.unmount();

    await vi.advanceTimersByTimeAsync(BACKUP_INTERVAL_MS);
    expect(createBackup).toHaveBeenCalledTimes(1);
  });
});
