import "fake-indexeddb/auto";
import { mount } from "@vue/test-utils";
import { closeDb, loadDocument } from "@wechat-flow/core";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { useEditorStore } from "../../../stores/editor.ts";
import EditorShell from "../EditorShell.vue";

vi.mock("../../../use-cases/render.ts", () => ({
  composeRender: vi.fn().mockResolvedValue({
    html: "<p>preview</p>",
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

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

beforeEach(() => {
  setViewportWidth(1440);
  setActivePinia(createPinia());
});

afterEach(async () => {
  await closeDb();
  indexedDB.deleteDatabase("wechat-flow-db");
  for (const el of document.body.querySelectorAll('[data-testid="hamburger-btn"]')) {
    el.remove();
  }
  vi.clearAllMocks();
});

describe("AC-4 草稿接线: setContent → saveDraft → loadDocument 往返", () => {
  it("setContent 调用后 IndexedDB 中持久化指定内容", async () => {
    const store = useEditorStore();
    await store.setContent("# 草稿标题\n\n内容段落");

    const saved = await loadDocument("draft-default");
    expect(saved).not.toBeUndefined();
    expect(saved?.content).toBe("# 草稿标题\n\n内容段落");
  });

  it("loadDraft 从 IndexedDB 恢复 content 到 store.content", async () => {
    // Seed DB via setContent on store1
    const store1 = useEditorStore();
    await store1.setContent("# 恢复测试");

    // Fresh Pinia simulates process restart / new session
    setActivePinia(createPinia());
    const store2 = useEditorStore();
    expect(store2.content).toBe(""); // starts empty

    await store2.loadDraft();
    expect(store2.content).toBe("# 恢复测试");
  });

  it("SourcePane onValueChange 接线到 setContent — saveDraft 被调用并持久化", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const sourcePane = wrapper.findComponent({ name: "SourcePane" });
    expect(sourcePane.exists()).toBe(true);
    const onValueChange = sourcePane.props("onValueChange") as (v: string) => void;
    expect(typeof onValueChange).toBe("function");

    onValueChange("新内容");
    await nextTick();
    await nextTick();

    const saved = await loadDocument("draft-default");
    expect(saved).not.toBeUndefined();
    expect(saved?.content).toBe("新内容");

    wrapper.unmount();
  });

  it("SourcePane :model-value 绑定到 store.content（store 更新则 prop 更新）", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [pinia] },
    });
    await nextTick();

    const store = useEditorStore();
    // Directly mutate content (bypassing saveDraft) to test the prop binding
    store.content = "绑定测试";
    await nextTick();

    const sourcePane = wrapper.findComponent({ name: "SourcePane" });
    expect(sourcePane.exists()).toBe(true);
    expect(sourcePane.props("modelValue")).toBe("绑定测试");

    wrapper.unmount();
  });
});
