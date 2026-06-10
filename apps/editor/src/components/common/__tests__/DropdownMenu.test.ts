import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import DropdownMenu from "../DropdownMenu.vue";
import type { MenuItem } from "../DropdownMenu.vue";

const makeItems = (): MenuItem[] => [
  { id: "item-a", label: "动作A" },
  { id: "item-b", label: "动作B", shortcut: "Ctrl+B" },
  { type: "separator" },
  { id: "item-c", label: "禁用项", disabled: true },
];

describe("DropdownMenu: 基础渲染与交互", () => {
  it("isOpen=true 时渲染菜单容器", async () => {
    const wrapper = mount(DropdownMenu, {
      props: {
        isOpen: true,
        items: makeItems(),
        onSelect: vi.fn(),
        onClose: vi.fn(),
      },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="dropdown-menu"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("isOpen=false 时菜单不可见（aria-hidden 或 DOM 不存在）", async () => {
    const wrapper = mount(DropdownMenu, {
      props: {
        isOpen: false,
        items: makeItems(),
        onSelect: vi.fn(),
        onClose: vi.fn(),
      },
    });
    await nextTick();

    const menu = wrapper.find('[data-testid="dropdown-menu"]');
    const visible = menu.exists() && menu.attributes("aria-hidden") !== "true";
    expect(visible).toBe(false);
    wrapper.unmount();
  });

  it("渲染所有非 separator 菜单项", async () => {
    const wrapper = mount(DropdownMenu, {
      props: {
        isOpen: true,
        items: makeItems(),
        onSelect: vi.fn(),
        onClose: vi.fn(),
      },
    });
    await nextTick();

    const menuItems = wrapper.findAll('[data-testid^="menu-item-"]');
    expect(menuItems.length).toBe(3);
    wrapper.unmount();
  });

  it("渲染 separator 分隔线", async () => {
    const wrapper = mount(DropdownMenu, {
      props: {
        isOpen: true,
        items: makeItems(),
        onSelect: vi.fn(),
        onClose: vi.fn(),
      },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="menu-separator"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("含 shortcut 的菜单项渲染快捷键文字", async () => {
    const wrapper = mount(DropdownMenu, {
      props: {
        isOpen: true,
        items: makeItems(),
        onSelect: vi.fn(),
        onClose: vi.fn(),
      },
    });
    await nextTick();

    const item = wrapper.find('[data-testid="menu-item-item-b"]');
    expect(item.text()).toContain("Ctrl+B");
    wrapper.unmount();
  });

  it("点击正常菜单项触发 onSelect 并传入 item id", async () => {
    const onSelect = vi.fn();
    const wrapper = mount(DropdownMenu, {
      props: {
        isOpen: true,
        items: makeItems(),
        onSelect,
        onClose: vi.fn(),
      },
    });
    await nextTick();

    await wrapper.find('[data-testid="menu-item-item-a"]').trigger("click");
    await nextTick();

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith("item-a");
    wrapper.unmount();
  });

  it("点击 disabled 菜单项不触发 onSelect", async () => {
    const onSelect = vi.fn();
    const wrapper = mount(DropdownMenu, {
      props: {
        isOpen: true,
        items: makeItems(),
        onSelect,
        onClose: vi.fn(),
      },
    });
    await nextTick();

    await wrapper.find('[data-testid="menu-item-item-c"]').trigger("click");
    await nextTick();

    expect(onSelect).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("disabled 菜单项含 disabled class", async () => {
    const wrapper = mount(DropdownMenu, {
      props: {
        isOpen: true,
        items: makeItems(),
        onSelect: vi.fn(),
        onClose: vi.fn(),
      },
    });
    await nextTick();

    const disabledItem = wrapper.find('[data-testid="menu-item-item-c"]');
    expect(disabledItem.classes()).toContain("dropdown-menu__item--disabled");
    wrapper.unmount();
  });
});
