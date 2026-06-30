import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import NightModeWarningBanner from "../NightModeWarningBanner.vue";

describe("NightModeWarningBanner", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  // AC-002: banner 文案包含夜间/风险/对比语义，且不承诺像素级一致
  it("AC-002: banner 含「夜间」「风险」「对比」关键词", () => {
    const wrapper = mount(NightModeWarningBanner, {
      props: { visible: true, dismissed: false },
    });
    const text = wrapper.text();
    expect(text).toMatch(/夜间|夜晚/);
    expect(text).toMatch(/风险|对比盲区|盲区/);
    expect(text).toMatch(/对比/);
    wrapper.unmount();
  });

  it("AC-002: banner 文案不承诺像素级模拟", () => {
    const wrapper = mount(NightModeWarningBanner, {
      props: { visible: true, dismissed: false },
    });
    const text = wrapper.text();
    expect(text).not.toContain("像素级还原");
    expect(text).not.toContain("模拟真实");
    wrapper.unmount();
  });

  // AC-005: banner 含关闭按钮，点击后 emit dismiss
  it("AC-005: banner 渲染关闭按钮", () => {
    const wrapper = mount(NightModeWarningBanner, {
      props: { visible: true, dismissed: false },
    });
    const closeBtn = wrapper.find("[data-testid='night-banner-close']");
    expect(closeBtn.exists()).toBe(true);
    wrapper.unmount();
  });

  it("AC-005: 点击关闭按钮后 emit dismiss", async () => {
    const wrapper = mount(NightModeWarningBanner, {
      props: { visible: true, dismissed: false },
    });
    await wrapper.find("[data-testid='night-banner-close']").trigger("click");
    expect(wrapper.emitted("dismiss")).toBeTruthy();
    wrapper.unmount();
  });

  // AC-004: dismissed=true 时不渲染 banner
  it("AC-004 / AC-005: dismissed=true 时 banner 不可见", () => {
    const wrapper = mount(NightModeWarningBanner, {
      props: { visible: true, dismissed: true },
    });
    expect(wrapper.find("[data-testid='night-banner']").exists()).toBe(false);
    wrapper.unmount();
  });

  // AC-004: visible=false 时不渲染 banner
  it("AC-004: visible=false 时 banner 不渲染", () => {
    const wrapper = mount(NightModeWarningBanner, {
      props: { visible: false, dismissed: false },
    });
    expect(wrapper.find("[data-testid='night-banner']").exists()).toBe(false);
    wrapper.unmount();
  });

  // visible=true && dismissed=false → banner 可见
  it("visible=true 且 dismissed=false 时 banner 可见", () => {
    const wrapper = mount(NightModeWarningBanner, {
      props: { visible: true, dismissed: false },
    });
    expect(wrapper.find("[data-testid='night-banner']").exists()).toBe(true);
    wrapper.unmount();
  });

  // 快速冒烟：渲染无 vue-warn
  it("渲染无异常", async () => {
    const wrapper = mount(NightModeWarningBanner, {
      props: { visible: true, dismissed: false },
    });
    await nextTick();
    expect(wrapper.element).toBeTruthy();
    wrapper.unmount();
  });
});
