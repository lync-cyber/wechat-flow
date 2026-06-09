import "fake-indexeddb/auto";
import { mount } from "@vue/test-utils";
import { closeDb } from "@wechat-flow/core";
import { createPinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import EditorShell from "../EditorShell.vue";

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

beforeEach(() => setViewportWidth(1440));

afterEach(async () => {
  await closeDb();
  indexedDB.deleteDatabase("wechat-flow-db");
  setViewportWidth(1440);
});

describe("视口切换接线: 视口按钮点击驱动 PreviewPane viewport prop", () => {
  it("初始 PreviewPane viewport 为 375（手机）", async () => {
    const wrapper = mount(EditorShell, {
      global: { plugins: [createPinia()] },
      attachTo: document.body,
    });
    await nextTick();
    const preview = wrapper.findComponent({ name: "PreviewPane" });
    expect(preview.props("viewport")).toBe("375");
    wrapper.unmount();
  });

  it("点击「平板」(768) 按钮后 PreviewPane viewport 更新为 768", async () => {
    const wrapper = mount(EditorShell, {
      global: { plugins: [createPinia()] },
      attachTo: document.body,
    });
    await nextTick();

    await wrapper.find('[data-testid="viewport-btn-768"]').trigger("click");
    await nextTick();

    const preview = wrapper.findComponent({ name: "PreviewPane" });
    expect(preview.props("viewport")).toBe("768");
    wrapper.unmount();
  });

  it("点击「自适应」(auto) 按钮后 PreviewPane viewport 更新为 auto", async () => {
    const wrapper = mount(EditorShell, {
      global: { plugins: [createPinia()] },
      attachTo: document.body,
    });
    await nextTick();

    await wrapper.find('[data-testid="viewport-btn-auto"]').trigger("click");
    await nextTick();

    const preview = wrapper.findComponent({ name: "PreviewPane" });
    expect(preview.props("viewport")).toBe("auto");
    wrapper.unmount();
  });
});
