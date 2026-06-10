import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import ContextMenu from "../ContextMenu.vue";

const defaultProps = () => ({
  isOpen: true,
  isContentEmpty: false,
  onClose: vi.fn(),
  onCommand: vi.fn(),
});

describe("AC-003: ContextMenu 展开含正确菜单项，复用 command-registry 命令", () => {
  it("isOpen=true 时渲染 context-menu 容器", async () => {
    const wrapper = mount(ContextMenu, { props: defaultProps() });
    await nextTick();

    expect(wrapper.find('[data-testid="context-menu"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("isOpen=false 时菜单不可见", async () => {
    const wrapper = mount(ContextMenu, {
      props: { ...defaultProps(), isOpen: false },
    });
    await nextTick();

    const menu = wrapper.find('[data-testid="context-menu"]');
    const visible = menu.exists() && menu.attributes("aria-hidden") !== "true";
    expect(visible).toBe(false);
    wrapper.unmount();
  });

  it("含「中文排版修订」菜单项", async () => {
    const wrapper = mount(ContextMenu, { props: defaultProps() });
    await nextTick();

    const item = wrapper.find('[data-testid="menu-item-content-zh-typo"]');
    expect(item.exists()).toBe(true);
    expect(item.text()).toContain("中文排版修订");
    wrapper.unmount();
  });

  it("含「复制 HTML」菜单项", async () => {
    const wrapper = mount(ContextMenu, { props: defaultProps() });
    await nextTick();

    const item = wrapper.find('[data-testid="menu-item-export-copy-html"]');
    expect(item.exists()).toBe(true);
    expect(item.text()).toContain("复制");
    wrapper.unmount();
  });

  it("含「下载 HTML」菜单项", async () => {
    const wrapper = mount(ContextMenu, { props: defaultProps() });
    await nextTick();

    const item = wrapper.find('[data-testid="menu-item-export-download-html"]');
    expect(item.exists()).toBe(true);
    expect(item.text()).toContain("下载");
    wrapper.unmount();
  });

  it("含「快捷键手册」菜单项", async () => {
    const wrapper = mount(ContextMenu, { props: defaultProps() });
    await nextTick();

    const item = wrapper.find('[data-testid="menu-item-help-shortcuts"]');
    expect(item.exists()).toBe(true);
    wrapper.unmount();
  });

  it("isContentEmpty=true 时「中文排版修订」项含 disabled class", async () => {
    const wrapper = mount(ContextMenu, {
      props: { ...defaultProps(), isContentEmpty: true },
    });
    await nextTick();

    const item = wrapper.find('[data-testid="menu-item-content-zh-typo"]');
    expect(item.classes()).toContain("dropdown-menu__item--disabled");
    wrapper.unmount();
  });

  it("isContentEmpty=false 时「中文排版修订」项不含 disabled class", async () => {
    const wrapper = mount(ContextMenu, {
      props: { ...defaultProps(), isContentEmpty: false },
    });
    await nextTick();

    const item = wrapper.find('[data-testid="menu-item-content-zh-typo"]');
    expect(item.classes()).not.toContain("dropdown-menu__item--disabled");
    wrapper.unmount();
  });

  it("点击「中文排版修订」触发 onCommand 并传入 command-registry id 'content-zh-typo'", async () => {
    const onCommand = vi.fn();
    const wrapper = mount(ContextMenu, {
      props: { ...defaultProps(), onCommand },
    });
    await nextTick();

    await wrapper.find('[data-testid="menu-item-content-zh-typo"]').trigger("click");
    await nextTick();

    expect(onCommand).toHaveBeenCalledWith("content-zh-typo");
    wrapper.unmount();
  });

  it("点击「复制 HTML」触发 onCommand 并传入 'export-copy-html'", async () => {
    const onCommand = vi.fn();
    const wrapper = mount(ContextMenu, {
      props: { ...defaultProps(), onCommand },
    });
    await nextTick();

    await wrapper.find('[data-testid="menu-item-export-copy-html"]').trigger("click");
    await nextTick();

    expect(onCommand).toHaveBeenCalledWith("export-copy-html");
    wrapper.unmount();
  });

  it("菜单含至少一条分隔线", async () => {
    const wrapper = mount(ContextMenu, { props: defaultProps() });
    await nextTick();

    expect(wrapper.find('[data-testid="menu-separator"]').exists()).toBe(true);
    wrapper.unmount();
  });
});
