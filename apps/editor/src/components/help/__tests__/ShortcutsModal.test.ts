import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import ShortcutsModal from "../ShortcutsModal.vue";

describe("ShortcutsModal", () => {
  it("isOpen=true 时渲染至少一个分组与 kbd 快捷键条目", () => {
    const wrapper = mount(ShortcutsModal, {
      props: { isOpen: true, onClose: vi.fn() },
    });
    expect(wrapper.find('[data-testid="shortcuts-modal"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="shortcuts-group-视图"]').exists()).toBe(true);
    expect(wrapper.find("kbd").exists()).toBe(true);
    expect(wrapper.text()).toContain("Ctrl+Z");
  });

  it("isOpen=false 时不在 DOM", () => {
    const wrapper = mount(ShortcutsModal, {
      props: { isOpen: false, onClose: vi.fn() },
    });
    expect(wrapper.find('[data-testid="shortcuts-modal"]').exists()).toBe(false);
  });

  it("点击关闭按钮触发 onClose", async () => {
    const onClose = vi.fn();
    const wrapper = mount(ShortcutsModal, {
      props: { isOpen: true, onClose },
    });
    await wrapper.find('[data-testid="shortcuts-modal-close"]').trigger("click");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
