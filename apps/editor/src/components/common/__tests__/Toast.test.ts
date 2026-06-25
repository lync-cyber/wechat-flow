import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import Toast from "../Toast.vue";

describe("AC-003: Toast type='success' → 背景/边框 token class，3000ms 后自动调用 onClose", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("type=success → 根元素含 toast--success class（--color-success-subtle 背景 + 左边框 token）", async () => {
    const onClose = vi.fn();
    const wrapper = mount(Toast, {
      props: { type: "success", message: "操作成功", onClose },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="toast-success"]').classes()).toContain("toast--success");
    wrapper.unmount();
  });

  it("type=success → 3000ms 后自动调用 onClose（fake timers）", async () => {
    const onClose = vi.fn();
    const wrapper = mount(Toast, {
      props: { type: "success", message: "操作成功", onClose },
    });
    await nextTick();

    expect(onClose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(onClose).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("type=success → 2999ms 时 onClose 尚未被调用", async () => {
    const onClose = vi.fn();
    const wrapper = mount(Toast, {
      props: { type: "success", message: "操作成功", onClose },
    });
    await nextTick();

    vi.advanceTimersByTime(2999);
    expect(onClose).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});

describe("AC-004: Toast type='error' → 不自动消失，需用户手动点关闭", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("type=error → 推进任意时长后 onClose 不被自动调用", async () => {
    const onClose = vi.fn();
    const wrapper = mount(Toast, {
      props: { type: "error", message: "发生错误", onClose },
    });
    await nextTick();

    vi.advanceTimersByTime(60000);
    expect(onClose).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("type=error → 点击关闭按钮触发 onClose", async () => {
    const onClose = vi.fn();
    const wrapper = mount(Toast, {
      props: { type: "error", message: "发生错误", onClose },
    });
    await nextTick();

    await wrapper.find('[data-testid="toast-close"]').trigger("click");
    await nextTick();

    expect(onClose).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("type=error → 根元素含 toast--error class（--color-error-subtle 背景 + 左边框 token）", async () => {
    const onClose = vi.fn();
    const wrapper = mount(Toast, {
      props: { type: "error", message: "发生错误", onClose },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="toast-error"]').classes()).toContain("toast--error");
    wrapper.unmount();
  });
});

describe("Toast type='info' → 3000ms 自动消失", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("type=info → 3000ms 后自动调用 onClose", async () => {
    const onClose = vi.fn();
    const wrapper = mount(Toast, {
      props: { type: "info", message: "提示信息", onClose },
    });
    await nextTick();

    vi.advanceTimersByTime(3000);
    expect(onClose).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});

describe("Toast type='warning' → 5000ms 自动消失", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("type=warning → 5000ms 后自动调用 onClose", async () => {
    const onClose = vi.fn();
    const wrapper = mount(Toast, {
      props: { type: "warning", message: "警告信息", onClose },
    });
    await nextTick();

    vi.advanceTimersByTime(5000);
    expect(onClose).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("type=warning → 4999ms 时 onClose 尚未被调用", async () => {
    const onClose = vi.fn();
    const wrapper = mount(Toast, {
      props: { type: "warning", message: "警告信息", onClose },
    });
    await nextTick();

    vi.advanceTimersByTime(4999);
    expect(onClose).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});

describe("Toast 消息内容渲染", () => {
  it("渲染传入的 message 文字", async () => {
    const onClose = vi.fn();
    const wrapper = mount(Toast, {
      props: { type: "success", message: "复制成功！", onClose },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="toast-message"]').text()).toBe("复制成功！");
    wrapper.unmount();
  });
});
