import "fake-indexeddb/auto";
import { mount } from "@vue/test-utils";
import { closeDb } from "@wechat-flow/core";
import { registerTheme, resetThemeRegistry } from "@wechat-flow/core/src/registry/theme.ts";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { useEditorStore } from "../../../stores/editor.ts";
import EditorShell from "../../layout/EditorShell.vue";

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

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1440 });
  setActivePinia(createPinia());
  resetThemeRegistry();
  registerTheme({ id: "default", name: "默认主题", tokens: {}, paintable: {}, assets: {} });
  registerTheme({ id: "tech", name: "科技数码", tokens: {}, paintable: {}, assets: {} });
  registerTheme({ id: "literary", name: "文学风", tokens: {}, paintable: {}, assets: {} });
});

afterEach(async () => {
  await closeDb();
  indexedDB.deleteDatabase("wechat-flow-db");
  for (const el of document.body.querySelectorAll('[data-testid="hamburger-btn"]')) {
    el.remove();
  }
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1440 });
  vi.clearAllMocks();
  resetThemeRegistry();
});

describe("AC-001: Ctrl+K 在 EditorShell 级打开 CommandPalette", () => {
  it("初始状态 CommandPalette 不在 DOM", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    expect(wrapper.find('[data-testid="command-palette"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("Ctrl+K keydown 后 CommandPalette 出现在 DOM", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true })
    );
    await nextTick();

    expect(wrapper.find('[data-testid="command-palette"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("Cmd+K（metaKey）也能打开 CommandPalette", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true, cancelable: true })
    );
    await nextTick();

    expect(wrapper.find('[data-testid="command-palette"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("面板打开后含 command-palette--open class", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true })
    );
    await nextTick();

    const palette = wrapper.find('[data-testid="command-palette"]');
    expect(palette.classes()).toContain("command-palette--open");
    wrapper.unmount();
  });
});

describe("AC-003: switch-theme-tech 命令执行 → editorStore.currentTheme 变为 tech", () => {
  it("执行 switch-theme-tech 命令后 store.currentTheme === 'tech'", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [pinia] },
    });
    await nextTick();

    const store = useEditorStore();
    expect(store.currentTheme).toBe("default");

    // Open palette
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true })
    );
    await nextTick();

    expect(wrapper.find('[data-testid="command-palette"]').exists()).toBe(true);

    // Filter to find tech theme command
    const input = wrapper.find('[data-testid="command-search-input"]');
    await input.setValue("科技数码");
    await nextTick();

    // Click the tech theme command item
    const techItem = wrapper.find('[data-testid="command-item-switch-theme-tech"]');
    expect(techItem.exists()).toBe(true);
    await techItem.trigger("click");
    await nextTick();

    expect(store.currentTheme).toBe("tech");
    wrapper.unmount();
  });
});

describe("AC-004: Esc 在 EditorShell 级关闭 CommandPalette", () => {
  it("面板打开后按 Esc 面板消失", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true })
    );
    await nextTick();
    expect(wrapper.find('[data-testid="command-palette"]').exists()).toBe(true);

    // Esc dispatched on the palette element itself
    const paletteEl = wrapper.find('[data-testid="command-palette"]').element as HTMLElement;
    paletteEl.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
    );
    await nextTick();

    expect(wrapper.find('[data-testid="command-palette"]').exists()).toBe(false);
    wrapper.unmount();
  });
});
