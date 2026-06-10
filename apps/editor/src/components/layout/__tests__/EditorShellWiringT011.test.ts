import "fake-indexeddb/auto";
import { mount } from "@vue/test-utils";
import { closeDb } from "@wechat-flow/core";
import { createPinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { composeRender } from "../../../use-cases/render.ts";
import EditorShell from "../EditorShell.vue";

// Mock composeRender so tests are deterministic and don't hit real rendering
vi.mock("../../../use-cases/render.ts", () => ({
  composeRender: vi.fn().mockResolvedValue({
    html: "<h1>Hello</h1>",
    diagnostics: [],
    versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
    report: {
      diagnostics: [],
      nodeChangeRecords: [],
      nightRiskIssues: [],
      versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
    },
  }),
}));

afterEach(async () => {
  await closeDb();
  indexedDB.deleteDatabase("wechat-flow-db");
  for (const el of document.body.querySelectorAll('[data-testid="hamburger-btn"]')) {
    el.remove();
  }
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1440 });
  vi.clearAllMocks();
});

describe("AC-002: SourcePane onValueChange → debounce 300ms → composeRender → PreviewPane htmlContent 更新", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1440,
    });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("SourcePane onValueChange 触发后 300ms PreviewPane 收到更新后的 html", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    // Locate the SourcePane component in the center panel
    const sourcePane = wrapper.findComponent({ name: "SourcePane" });
    expect(sourcePane.exists()).toBe(true);

    // Trigger onValueChange directly (SourcePane already debounces internally — we call handler directly)
    const onValueChange = sourcePane.props("onValueChange") as (value: string) => void;
    expect(typeof onValueChange).toBe("function");

    // Simulate the debounced callback firing (SourcePane internally fires this after 300ms)
    onValueChange("# Hello");

    // Advance timers to flush any pending async (composeRender is async)
    await vi.runAllTimersAsync();
    await nextTick();
    await nextTick();

    // PreviewPane htmlContent should now be updated
    const previewPane = wrapper.findComponent({ name: "PreviewPane" });
    expect(previewPane.exists()).toBe(true);
    const htmlContent = previewPane.props("htmlContent") as string;
    expect(typeof htmlContent).toBe("string");
    expect(htmlContent).toBe("<h1>Hello</h1>");

    wrapper.unmount();
  });

  it("初始挂载时 PreviewPane htmlContent 为空字符串（未触发渲染）", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const previewPane = wrapper.findComponent({ name: "PreviewPane" });
    expect(previewPane.exists()).toBe(true);
    expect(previewPane.props("htmlContent")).toBe("");

    wrapper.unmount();
  });

  it("CodeMirror 文档变更 <300ms 内 composeRender 未被调用，满 300ms 后调用", async () => {
    const mockComposeRender = vi.mocked(composeRender);
    mockComposeRender.mockClear();

    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const sourcePane = wrapper.findComponent({ name: "SourcePane" });
    expect(sourcePane.exists()).toBe(true);

    // defineExpose({ editorView }) — VTU auto-unwraps Refs on vm access
    const sourcePaneVm = sourcePane.vm as {
      editorView: import("@codemirror/view").EditorView | null;
    };
    const editorView = sourcePaneVm.editorView;
    if (editorView === null) throw new Error("editorView is null — CodeMirror did not mount");

    // Dispatch a document change through CodeMirror — this goes through the real debounce path
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: "# Debounce Test" },
    });

    // Before 300ms: composeRender should NOT have been called yet
    await vi.advanceTimersByTimeAsync(299);
    expect(mockComposeRender).not.toHaveBeenCalled();

    // At 300ms: debounce fires, composeRender should be called
    await vi.advanceTimersByTimeAsync(1);
    // composeRender is called by editorStore.updatePreview which is async — flush promises
    await nextTick();
    expect(mockComposeRender).toHaveBeenCalledTimes(1);
    expect(mockComposeRender).toHaveBeenCalledWith(
      expect.objectContaining({ markdown: "# Debounce Test" })
    );

    wrapper.unmount();
  });
});
