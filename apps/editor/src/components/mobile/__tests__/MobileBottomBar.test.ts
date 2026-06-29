import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import MobileBottomBar from "../MobileBottomBar.vue";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("MobileBottomBar: 布局与结构", () => {
  it("渲染 data-testid=mobile-bottom-bar，高度 56px", () => {
    const wrapper = mount(MobileBottomBar, {
      props: { docTitle: "测试文档" },
    });
    const bar = wrapper.find('[data-testid="mobile-bottom-bar"]');
    expect(bar.exists()).toBe(true);
    expect(bar.attributes("style") ?? "").toMatch(/height:\s*56px/);
  });

  it("渲染文档切换按钮（data-testid=btn-switch-doc）展示当前文档名", () => {
    const wrapper = mount(MobileBottomBar, {
      props: { docTitle: "我的文章" },
    });
    const btn = wrapper.find('[data-testid="btn-switch-doc"]');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toContain("我的文章");
  });

  it("渲染一键复制按钮（data-testid=btn-copy）", () => {
    const wrapper = mount(MobileBottomBar, {
      props: { docTitle: "文档" },
    });
    expect(wrapper.find('[data-testid="btn-copy"]').exists()).toBe(true);
  });
});

describe("MobileBottomBar: 事件", () => {
  it("点击文档切换按钮 emit open-doc-list", async () => {
    const wrapper = mount(MobileBottomBar, {
      props: { docTitle: "文档" },
    });
    await wrapper.find('[data-testid="btn-switch-doc"]').trigger("click");
    await nextTick();
    expect(wrapper.emitted("open-doc-list")).toBeTruthy();
  });

  it("点击一键复制按钮 emit copy", async () => {
    const wrapper = mount(MobileBottomBar, {
      props: { docTitle: "文档" },
    });
    await wrapper.find('[data-testid="btn-copy"]').trigger("click");
    await nextTick();
    expect(wrapper.emitted("copy")).toBeTruthy();
  });
});
