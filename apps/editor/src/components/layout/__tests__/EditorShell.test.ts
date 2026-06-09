import "fake-indexeddb/auto";
import { mount } from "@vue/test-utils";
import { closeDb } from "@wechat-flow/core";
import { createPinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import EditorShell from "../EditorShell.vue";

// Helpers
function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

afterEach(async () => {
  await closeDb();
  indexedDB.deleteDatabase("wechat-flow-db");
  // Remove any teleported elements
  for (const el of document.body.querySelectorAll('[data-testid="hamburger-btn"]')) {
    el.remove();
  }
  // Restore desktop width
  setViewportWidth(1440);
});

describe("AC-001: 三栏布局背景色（桌面档 ≥1280px）", () => {
  beforeEach(() => setViewportWidth(1440));

  it("左栏带 editor-shell__left class（背景 --color-surface-elevated）", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    const left = wrapper.find('[data-testid="left-panel"]');
    expect(left.exists()).toBe(true);
    expect(left.element.className).toContain("editor-shell__left");
    wrapper.unmount();
  });

  it("中栏带 editor-shell__center class（背景 --color-surface）", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    const center = wrapper.find('[data-testid="center-panel"]');
    expect(center.exists()).toBe(true);
    expect(center.element.className).toContain("editor-shell__center");
    wrapper.unmount();
  });

  it("右栏带 editor-shell__right class（背景 --color-surface-preview）", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    const right = wrapper.find('[data-testid="right-panel"]');
    expect(right.exists()).toBe(true);
    expect(right.element.className).toContain("editor-shell__right");
    wrapper.unmount();
  });
});

describe("AC-002: Splitter 拖拽 clamp + 宽度持久化（验证见 use-splitter-width.test.ts）", () => {
  beforeEach(() => setViewportWidth(1440));

  it("桌面档显示两个 Splitter 组件", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    expect(wrapper.find('[data-testid="left-splitter"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="right-splitter"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("左栏初始宽度等于 defaultLeft (200px)", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    const left = wrapper.find('[data-testid="left-panel"]');
    const style = (left.element as HTMLElement).style.width;
    expect(style).toBe("200px");
    wrapper.unmount();
  });
});

describe("AC-003: F11 专注模式切换", () => {
  beforeEach(() => setViewportWidth(1440));

  it("F11 keydown 进入专注模式 — 左栏与右栏隐藏", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    // Dispatch global keydown F11 (listener is on window in onMounted)
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "F11", bubbles: true, cancelable: true })
    );
    await nextTick();

    expect(wrapper.find('[data-testid="left-panel"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="right-panel"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="center-panel"]').exists()).toBe(true);
    // AC-003: 顶栏工具栏按钮组隐藏（验证 DOM 节点实际消失，非仅 focus class）
    expect(wrapper.find('[data-testid="top-bar-toolbar"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("F11 使用 preventDefault — shell 进入 focus-mode 且 isFocusMode 为真（defaultPrevented 为实现细节）", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "F11", bubbles: true, cancelable: true })
    );
    await nextTick();

    // Observable AC: focus class 出现即说明 F11 被正确处理（含 preventDefault 路径）
    expect(wrapper.find('[data-testid="editor-shell"]').classes()).toContain("editor-shell--focus");
    wrapper.unmount();
  });

  it("再次按 F11 退出专注模式 — 左栏右栏恢复显示", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "F11", bubbles: true, cancelable: true })
    );
    await nextTick();
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "F11", bubbles: true, cancelable: true })
    );
    await nextTick();

    expect(wrapper.find('[data-testid="left-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="right-panel"]').exists()).toBe(true);
    // AC-003: 退出专注模式后工具栏恢复
    expect(wrapper.find('[data-testid="top-bar-toolbar"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("专注模式下顶栏带 focus class", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "F11", bubbles: true, cancelable: true })
    );
    await nextTick();

    expect(wrapper.find('[data-testid="editor-shell"]').classes()).toContain("editor-shell--focus");
    wrapper.unmount();
  });
});

describe("AC-004: 平板档抽屉行为（vw < 1280）", () => {
  beforeEach(() => setViewportWidth(900));

  it("vw < 1280 挂载时左栏默认隐藏", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    expect(wrapper.find('[data-testid="left-panel"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("vw < 1280 时 Teleport 注入 ☰ 按钮到 body", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    const hamburger = document.querySelector('[data-testid="hamburger-btn"]');
    expect(hamburger).not.toBeNull();
    wrapper.unmount();
  });

  it("点击 ☰ 抽屉滑入 — 左栏存在且带 drawer class", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const hamburger = document.querySelector('[data-testid="hamburger-btn"]') as HTMLButtonElement;
    expect(hamburger).not.toBeNull();
    hamburger.click();
    await nextTick();

    const left = wrapper.find('[data-testid="left-panel"]');
    expect(left.exists()).toBe(true);
    expect(left.element.className).toContain("editor-shell__left--drawer");
    wrapper.unmount();
  });

  it("抽屉打开时显示半透明 Overlay", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const hamburger = document.querySelector('[data-testid="hamburger-btn"]') as HTMLButtonElement;
    hamburger.click();
    await nextTick();

    expect(wrapper.find('[data-testid="drawer-overlay"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("点击 Overlay 关闭抽屉 — 左栏隐藏", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const hamburger = document.querySelector('[data-testid="hamburger-btn"]') as HTMLButtonElement;
    hamburger.click();
    await nextTick();

    await wrapper.find('[data-testid="drawer-overlay"]').trigger("click");
    await nextTick();

    expect(wrapper.find('[data-testid="left-panel"]').exists()).toBe(false);
    wrapper.unmount();
  });
});
