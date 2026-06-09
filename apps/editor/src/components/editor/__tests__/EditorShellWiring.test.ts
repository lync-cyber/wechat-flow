import "fake-indexeddb/auto";
import { mount } from "@vue/test-utils";
import { closeDb } from "@wechat-flow/core";
import { createPinia } from "pinia";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import EditorShell from "../../layout/EditorShell.vue";

afterEach(async () => {
  await closeDb();
  indexedDB.deleteDatabase("wechat-flow-db");
  for (const el of document.body.querySelectorAll('[data-testid="hamburger-btn"]')) {
    el.remove();
  }
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1440 });
});

// AC-005: PreviewPane is mounted inside EditorShell right panel
describe("AC-005: PreviewPane 挂载在 EditorShell 右栏", () => {
  it("EditorShell 右栏内含 PreviewPane（data-testid=preview-pane）", async () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1440,
    });
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const rightPanel = wrapper.find('[data-testid="right-panel"]');
    expect(rightPanel.exists()).toBe(true);
    const previewPane = rightPanel.find('[data-testid="preview-pane"]');
    expect(previewPane.exists()).toBe(true);
    wrapper.unmount();
  });
});
