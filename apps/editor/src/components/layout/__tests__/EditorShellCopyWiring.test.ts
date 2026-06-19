import "fake-indexeddb/auto";
import { mount } from "@vue/test-utils";
import { closeDb } from "@wechat-flow/core";
import { createPinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import EditorShell from "../EditorShell.vue";

// Mock composeCopy so the test never touches real clipboard or rendering
vi.mock("../../../use-cases/copy.ts", () => ({
  composeCopy: vi.fn().mockResolvedValue(undefined),
}));

// Also mock composeRender to keep EditorShell's internal render path deterministic
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

// Lazy import after vi.mock hoisting
import { composeCopy } from "../../../use-cases/copy.ts";

afterEach(async () => {
  await closeDb();
  indexedDB.deleteDatabase("wechat-flow-db");
  for (const el of document.body.querySelectorAll('[data-testid="hamburger-btn"]')) {
    el.remove();
  }
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1440 });
  vi.clearAllMocks();
});

describe("AC-004: TopBar 复制控件 → onCopyHtml → composeCopy 被调用（生产路径接线验证）", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1440,
    });
  });

  it("点击 TopBar 复制按钮后 composeCopy 被调用", async () => {
    const mockComposeCopy = vi.mocked(composeCopy);
    mockComposeCopy.mockClear();

    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const topBar = wrapper.findComponent({ name: "TopBar" });
    expect(topBar.exists()).toBe(true);

    // Trigger the on-copy prop directly — this is the production path:
    // EditorShell binds :on-copy="onCopyHtml" to TopBar, which fires it on copy button click
    const onCopy = topBar.props("onCopy") as () => void;
    expect(typeof onCopy).toBe("function");
    onCopy();

    // composeCopy is async; allow microtasks to settle
    await nextTick();

    expect(mockComposeCopy).toHaveBeenCalledOnce();

    wrapper.unmount();
  });

  it("composeCopy 入参含 editorStore.content 与 editorStore.currentTheme", async () => {
    const mockComposeCopy = vi.mocked(composeCopy);
    mockComposeCopy.mockClear();

    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    // Seed editor store content via SourcePane prop path
    const sourcePane = wrapper.findComponent({ name: "SourcePane" });
    expect(sourcePane.exists()).toBe(true);
    const onValueChange = sourcePane.props("onValueChange") as (value: string) => void;
    onValueChange("# Hello World");
    await nextTick();

    // Trigger copy via TopBar prop
    const topBar = wrapper.findComponent({ name: "TopBar" });
    const onCopy = topBar.props("onCopy") as () => void;
    onCopy();
    await nextTick();

    expect(mockComposeCopy).toHaveBeenCalledOnce();
    expect(mockComposeCopy).toHaveBeenCalledWith(
      expect.objectContaining({
        markdown: "# Hello World",
        themeId: "default",
      })
    );

    wrapper.unmount();
  });

  it("点击 TopBar 复制按钮的 DOM 事件触发 composeCopy", async () => {
    const mockComposeCopy = vi.mocked(composeCopy);
    mockComposeCopy.mockClear();

    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    // Find the actual copy button rendered in the DOM
    const copyBtn = wrapper.find(".top-bar__copy-btn");
    expect(copyBtn.exists()).toBe(true);

    await copyBtn.trigger("click");
    await nextTick();

    expect(mockComposeCopy).toHaveBeenCalledOnce();

    wrapper.unmount();
  });
});
