import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import ContextMenu from "../ContextMenu.vue";

// ── AC-004: ContextMenu「检测违规词」入口 ──────────────────────────────────────

describe("AC-004: ContextMenu 含「检测违规词」菜单项", () => {
  const defaultProps = () => ({
    isOpen: true,
    isContentEmpty: false,
    onClose: vi.fn(),
    onCommand: vi.fn(),
  });

  it("渲染出 label 为「检测违规词」的菜单项", async () => {
    const wrapper = mount(ContextMenu, { props: defaultProps() });
    await nextTick();

    const item = wrapper.find('[data-testid="menu-item-content-keyword-lint"]');
    expect(item.exists()).toBe(true);
    expect(item.text()).toContain("检测违规词");
    wrapper.unmount();
  });

  it("点击「检测违规词」触发 onCommand 并传入 'content-keyword-lint'", async () => {
    const onCommand = vi.fn();
    const wrapper = mount(ContextMenu, {
      props: { ...defaultProps(), onCommand },
    });
    await nextTick();

    await wrapper.find('[data-testid="menu-item-content-keyword-lint"]').trigger("click");
    await nextTick();

    expect(onCommand).toHaveBeenCalledWith("content-keyword-lint");
    wrapper.unmount();
  });

  it("isContentEmpty=true 时「检测违规词」项含 disabled class", async () => {
    const wrapper = mount(ContextMenu, {
      props: { ...defaultProps(), isContentEmpty: true },
    });
    await nextTick();

    const item = wrapper.find('[data-testid="menu-item-content-keyword-lint"]');
    expect(item.classes()).toContain("dropdown-menu__item--disabled");
    wrapper.unmount();
  });

  it("isContentEmpty=false 时「检测违规词」项不含 disabled class", async () => {
    const wrapper = mount(ContextMenu, {
      props: { ...defaultProps(), isContentEmpty: false },
    });
    await nextTick();

    const item = wrapper.find('[data-testid="menu-item-content-keyword-lint"]');
    expect(item.classes()).not.toContain("dropdown-menu__item--disabled");
    wrapper.unmount();
  });
});
