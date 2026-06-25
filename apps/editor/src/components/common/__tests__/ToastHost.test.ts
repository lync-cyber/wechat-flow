import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import App from "../../../App.vue";
import { useToast } from "../../../composables/use-toast.ts";
import ToastHost from "../ToastHost.vue";

function clearToasts(): void {
  const { toasts, dismissToast } = useToast();
  for (const t of [...toasts.value]) {
    dismissToast(t.id);
  }
}

afterEach(() => {
  clearToasts();
  for (const el of document.body.querySelectorAll('[data-testid^="toast-"]')) {
    el.remove();
  }
  for (const el of document.body.querySelectorAll('[data-testid="toast-host"]')) {
    el.remove();
  }
});

describe("ToastHost: pushToast → Toast 气泡出现在 DOM 中", () => {
  it("挂载 ToastHost 后 pushToast({ type:'success', message:'X' }) → DOM 中出现对应文字", async () => {
    const wrapper = mount(ToastHost, { attachTo: document.body });
    await nextTick();

    const { pushToast } = useToast();
    pushToast({ type: "success", message: "操作成功" });
    await nextTick();

    const msg = document.body.querySelector('[data-testid="toast-message"]');
    expect(msg).not.toBeNull();
    expect(msg?.textContent).toContain("操作成功");

    wrapper.unmount();
  });

  it("pushToast({ type:'error', message:'Y' }) → DOM 中出现 error 类型 toast", async () => {
    const wrapper = mount(ToastHost, { attachTo: document.body });
    await nextTick();

    const { pushToast } = useToast();
    pushToast({ type: "error", message: "上传失败" });
    await nextTick();

    const toastEl = document.body.querySelector('[data-testid="toast-error"]');
    expect(toastEl).not.toBeNull();

    wrapper.unmount();
  });

  it("多次 pushToast → DOM 中同时有多个 toast 气泡", async () => {
    const wrapper = mount(ToastHost, { attachTo: document.body });
    await nextTick();

    const { pushToast } = useToast();
    pushToast({ type: "success", message: "第一条" });
    pushToast({ type: "error", message: "第二条" });
    await nextTick();

    const msgs = document.body.querySelectorAll('[data-testid="toast-message"]');
    expect(msgs.length).toBeGreaterThanOrEqual(2);

    wrapper.unmount();
  });
});

describe("ToastHost: dismissToast → 对应 Toast 从 DOM 移除", () => {
  it("dismissToast(id) 后对应消息从 DOM 消失", async () => {
    const wrapper = mount(ToastHost, { attachTo: document.body });
    await nextTick();

    const { pushToast, dismissToast, toasts } = useToast();
    pushToast({ type: "success", message: "待关闭" });
    await nextTick();

    expect(document.body.querySelector('[data-testid="toast-message"]')).not.toBeNull();

    const id = toasts.value[0]?.id;
    expect(id).toBeDefined();
    dismissToast(id as number);
    await nextTick();

    expect(document.body.querySelector('[data-testid="toast-message"]')).toBeNull();

    wrapper.unmount();
  });

  it("点击 Toast 关闭按钮 → 该 toast 从 DOM 移除", async () => {
    const wrapper = mount(ToastHost, { attachTo: document.body });
    await nextTick();

    const { pushToast } = useToast();
    pushToast({ type: "error", message: "点关闭" });
    await nextTick();

    const closeBtn = document.body.querySelector(
      '[data-testid="toast-close"]'
    ) as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();
    await nextTick();

    expect(document.body.querySelector('[data-testid="toast-message"]')).toBeNull();

    wrapper.unmount();
  });
});

describe("App wiring: ToastHost 在所有路由下始终挂载", () => {
  it("App.vue 渲染时包含 ToastHost 组件（全局 toast 宿主）", () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: { template: "<div />" },
        },
      },
    });

    expect(wrapper.findComponent(ToastHost).exists()).toBe(true);

    wrapper.unmount();
  });
});
