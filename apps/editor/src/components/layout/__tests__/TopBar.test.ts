import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import TopBar from "../TopBar.vue";

const defaultProps = {
  docTitle: "测试文档",
  themeName: "默认主题",
  themeAccentColor: "#2D5A4E",
  syncState: "idle" as const,
  isFocusMode: false,
  hasUnsavedChanges: false,
  canUndo: false,
  canRedo: false,
  onUndo: () => {},
  onRedo: () => {},
  onCopy: () => {},
};

describe("AC-005: TopBar Props 驱动渲染", () => {
  it("hasUnsavedChanges=true 时文档名后显示 · 符号（颜色 --color-text-muted）", () => {
    const wrapper = mount(TopBar, {
      props: { ...defaultProps, hasUnsavedChanges: true },
    });
    const dot = wrapper.find('[data-testid="top-bar-unsaved-dot"]');
    expect(dot.exists()).toBe(true);
    expect(dot.text()).toContain("·");
    wrapper.unmount();
  });

  it("hasUnsavedChanges=false 时不显示 · 符号", () => {
    const wrapper = mount(TopBar, {
      props: { ...defaultProps, hasUnsavedChanges: false },
    });
    expect(wrapper.find('[data-testid="top-bar-unsaved-dot"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("isFocusMode=true 时工具栏按钮组隐藏", () => {
    const wrapper = mount(TopBar, {
      props: { ...defaultProps, isFocusMode: true },
    });
    expect(wrapper.find('[data-testid="top-bar-toolbar"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("isFocusMode=true 时顶栏带 focus class（底边线消失）", () => {
    const wrapper = mount(TopBar, {
      props: { ...defaultProps, isFocusMode: true },
    });
    expect(wrapper.find('[data-testid="top-bar"]').classes()).toContain("top-bar--focus");
    wrapper.unmount();
  });

  it("isFocusMode=false 时工具栏按钮组可见", () => {
    const wrapper = mount(TopBar, {
      props: { ...defaultProps, isFocusMode: false },
    });
    expect(wrapper.find('[data-testid="top-bar-toolbar"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("docTitle 正确渲染在文档名区域", () => {
    const wrapper = mount(TopBar, {
      props: { ...defaultProps, docTitle: "我的文章" },
    });
    expect(wrapper.find('[data-testid="top-bar-doc-name"]').text()).toContain("我的文章");
    wrapper.unmount();
  });

  it("templateName 存在时追加 · template名", () => {
    const wrapper = mount(TopBar, {
      props: { ...defaultProps, templateName: "科技感" },
    });
    expect(wrapper.find('[data-testid="top-bar-theme"]').text()).toContain("科技感");
    wrapper.unmount();
  });
});
