import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import BaseColorDeriveModal from "../BaseColorDeriveModal.vue";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AC-001: open-empty 态 — 无主色时应用按钮 disabled", () => {
  it("currentBaseColor 未传时应用按钮 disabled", async () => {
    const wrapper = mount(BaseColorDeriveModal, {
      props: { isOpen: true, onApply: vi.fn(), onCancel: vi.fn() },
    });
    await nextTick();

    const btn = wrapper.find('[data-testid="derive-apply-btn"]');
    expect(btn.attributes("disabled")).toBeDefined();
    wrapper.unmount();
  });

  it("open-empty 态色块矩阵展示占位灰块", async () => {
    const wrapper = mount(BaseColorDeriveModal, {
      props: { isOpen: true, onApply: vi.fn(), onCancel: vi.fn() },
    });
    await nextTick();

    const matrix = wrapper.find('[data-testid="derive-token-matrix"]');
    expect(matrix.exists()).toBe(true);
    expect(matrix.findAll(".color-derive-modal__swatch-block--placeholder").length).toBeGreaterThan(
      0
    );
    wrapper.unmount();
  });
});

describe("AC-002: 合法 hex 输入 → debounce 300ms → 派生矩阵出现色块", () => {
  it("输入合法 hex 后 300ms 内色块矩阵不更新，满 300ms 后出现真实派生 token 色值", async () => {
    const wrapper = mount(BaseColorDeriveModal, {
      props: { isOpen: true, onApply: vi.fn(), onCancel: vi.fn() },
    });
    await nextTick();

    const input = wrapper.find('[data-testid="derive-hex-input"]');
    await input.setValue("#2D5A4E");

    await vi.advanceTimersByTimeAsync(299);
    await nextTick();
    expect(wrapper.find('[data-testid^="derive-token--color-brand"]').exists()).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await nextTick();

    const brandBlock = wrapper.find('[data-testid="derive-token---color-brand"]');
    expect(brandBlock.exists()).toBe(true);

    const btn = wrapper.find('[data-testid="derive-apply-btn"]');
    expect(btn.attributes("disabled")).toBeUndefined();
    wrapper.unmount();
  });
});

describe("AC-003: 非法 hex → 红文案出现；失焦回滚上一合法值", () => {
  it("输入非法字符触发红色错误文案", async () => {
    const wrapper = mount(BaseColorDeriveModal, {
      props: { isOpen: true, onApply: vi.fn(), onCancel: vi.fn() },
    });
    await nextTick();

    const input = wrapper.find('[data-testid="derive-hex-input"]');
    await input.setValue("zzz");
    await nextTick();

    expect(wrapper.find('[data-testid="derive-hex-error"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="derive-hex-error"]').text()).toContain(
      "请输入合法 hex 色值"
    );
    wrapper.unmount();
  });

  it("失焦时若仍非法，输入框回滚到上一次合法值", async () => {
    const wrapper = mount(BaseColorDeriveModal, {
      props: { isOpen: true, currentBaseColor: "#112233", onApply: vi.fn(), onCancel: vi.fn() },
    });
    await nextTick();

    const input = wrapper.find('[data-testid="derive-hex-input"]');
    await input.setValue("#112233");
    await vi.advanceTimersByTimeAsync(300);
    await nextTick();

    await input.setValue("zzz");
    await nextTick();
    expect(wrapper.find('[data-testid="derive-hex-error"]').exists()).toBe(true);

    await input.trigger("blur");
    await nextTick();

    expect((input.element as HTMLInputElement).value).toBe("#112233");
    expect(wrapper.find('[data-testid="derive-hex-error"]').exists()).toBe(false);
    wrapper.unmount();
  });
});

describe("AC-004: 点应用 → onApply 收到 (baseColor, tokens)", () => {
  it("点击应用按钮 onApply 以合法 hex 与派生字典调用", async () => {
    const onApply = vi.fn();
    const wrapper = mount(BaseColorDeriveModal, {
      props: { isOpen: true, onApply, onCancel: vi.fn() },
    });
    await nextTick();

    const input = wrapper.find('[data-testid="derive-hex-input"]');
    await input.setValue("#2D5A4E");
    await vi.advanceTimersByTimeAsync(300);
    await nextTick();

    await wrapper.find('[data-testid="derive-apply-btn"]').trigger("click");
    await nextTick();

    expect(onApply).toHaveBeenCalledOnce();
    const [baseColor, tokens] = onApply.mock.calls[0] as [string, Record<string, string>];
    expect(baseColor).toBe("#2D5A4E");
    expect(tokens["--color-brand"]).toBeDefined();
    wrapper.unmount();
  });

  it("点击取消按钮 onCancel 被调用", async () => {
    const onCancel = vi.fn();
    const wrapper = mount(BaseColorDeriveModal, {
      props: { isOpen: true, onApply: vi.fn(), onCancel },
    });
    await nextTick();

    await wrapper.find('[data-testid="derive-cancel-btn"]').trigger("click");
    await nextTick();

    expect(onCancel).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
});

describe("面板结构", () => {
  it("isOpen=false 时面板不存在于 DOM", async () => {
    const wrapper = mount(BaseColorDeriveModal, {
      props: { isOpen: false, onApply: vi.fn(), onCancel: vi.fn() },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="base-color-derive-modal"]').exists()).toBe(false);
    wrapper.unmount();
  });
});
