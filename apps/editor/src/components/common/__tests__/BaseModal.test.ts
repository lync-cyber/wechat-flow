import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import BaseModal from "../BaseModal.vue";

describe("BaseModal", () => {
  it("isOpen=false 时不存在于 DOM", () => {
    const wrapper = mount(BaseModal, {
      props: { isOpen: false, title: "标题", onClose: vi.fn() },
    });
    expect(wrapper.find('[data-testid="base-modal"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="base-modal-backdrop"]').exists()).toBe(false);
  });

  it("isOpen=true 时渲染 title 与默认 slot 内容", () => {
    const wrapper = mount(BaseModal, {
      props: { isOpen: true, title: "确认删除", onClose: vi.fn() },
      slots: { default: "<p>正文内容</p>" },
    });
    expect(wrapper.find('[data-testid="base-modal"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("确认删除");
    expect(wrapper.text()).toContain("正文内容");
  });

  it("按下 Esc 触发 onClose", async () => {
    const onClose = vi.fn();
    mount(BaseModal, {
      attachTo: document.body,
      props: { isOpen: true, title: "标题", onClose },
    });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("默认变体点击遮罩触发 onClose", async () => {
    const onClose = vi.fn();
    const wrapper = mount(BaseModal, {
      props: { isOpen: true, title: "标题", onClose },
    });
    await wrapper.find('[data-testid="base-modal-backdrop"]').trigger("click");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("confirm 变体点击遮罩不触发 onClose", async () => {
    const onClose = vi.fn();
    const wrapper = mount(BaseModal, {
      props: { isOpen: true, title: "标题", variant: "confirm", onClose },
    });
    await wrapper.find('[data-testid="base-modal-backdrop"]').trigger("click");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("size 映射为对应宽度 class", () => {
    const smWrapper = mount(BaseModal, {
      props: { isOpen: true, title: "标题", onClose: vi.fn() },
    });
    expect(smWrapper.find('[data-testid="base-modal"]').classes()).toContain("base-modal--sm");

    const lgWrapper = mount(BaseModal, {
      props: { isOpen: true, title: "标题", size: "lg", onClose: vi.fn() },
    });
    expect(lgWrapper.find('[data-testid="base-modal"]').classes()).toContain("base-modal--lg");
  });

  it("footer slot 可覆盖默认按钮行", () => {
    const wrapper = mount(BaseModal, {
      props: { isOpen: true, title: "标题", onClose: vi.fn() },
      slots: { footer: '<button data-testid="custom-footer-btn">自定义</button>' },
    });
    expect(wrapper.find('[data-testid="custom-footer-btn"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="base-modal-cancel"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="base-modal-confirm"]').exists()).toBe(false);
  });

  it("默认 footer 确认按钮点击 emit confirm", async () => {
    const wrapper = mount(BaseModal, {
      props: { isOpen: true, title: "标题", onClose: vi.fn() },
    });
    await wrapper.find('[data-testid="base-modal-confirm"]').trigger("click");
    expect(wrapper.emitted("confirm")).toHaveLength(1);
  });

  it("打开后焦点移入面板内首个可聚焦元素", async () => {
    const wrapper = mount(BaseModal, {
      attachTo: document.body,
      props: { isOpen: false, title: "标题", onClose: vi.fn() },
    });
    await wrapper.setProps({ isOpen: true });
    await new Promise((r) => setTimeout(r));
    const panel = wrapper.find('[data-testid="base-modal"]').element;
    expect(panel.contains(document.activeElement)).toBe(true);
    wrapper.unmount();
  });

  it("Tab 在末尾可聚焦元素时循环回第一个", async () => {
    const wrapper = mount(BaseModal, {
      attachTo: document.body,
      props: { isOpen: true, title: "标题", onClose: vi.fn() },
    });
    const cancel = wrapper.find('[data-testid="base-modal-cancel"]').element as HTMLButtonElement;
    const confirm = wrapper.find('[data-testid="base-modal-confirm"]').element as HTMLButtonElement;
    confirm.focus();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(cancel);
    wrapper.unmount();
  });

  it("Shift+Tab 在首个可聚焦元素时循环到最后一个", async () => {
    const wrapper = mount(BaseModal, {
      attachTo: document.body,
      props: { isOpen: true, title: "标题", onClose: vi.fn() },
    });
    const cancel = wrapper.find('[data-testid="base-modal-cancel"]').element as HTMLButtonElement;
    const confirm = wrapper.find('[data-testid="base-modal-confirm"]').element as HTMLButtonElement;
    cancel.focus();
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true })
    );
    expect(document.activeElement).toBe(confirm);
    wrapper.unmount();
  });

  it("关闭后焦点还原到打开前的元素", async () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();

    const wrapper = mount(BaseModal, {
      attachTo: document.body,
      props: { isOpen: false, title: "标题", onClose: vi.fn() },
    });
    await wrapper.setProps({ isOpen: true });
    await new Promise((r) => setTimeout(r));
    expect(document.activeElement).not.toBe(outside);

    await wrapper.setProps({ isOpen: false });
    expect(document.activeElement).toBe(outside);
    wrapper.unmount();
    outside.remove();
  });
});
