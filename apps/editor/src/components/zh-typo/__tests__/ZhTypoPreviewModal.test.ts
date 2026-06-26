import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import ZhTypoPreviewModal from "../ZhTypoPreviewModal.vue";

const sampleDiff = [
  { original: "这是GitHub的项目", revised: "这是 GitHub 的项目", ruleId: "zh-en-space" },
];
const samplePerRule = { "zh-en-space": 2 };

function makeProps(overrides = {}) {
  return {
    isOpen: true,
    diff: sampleDiff,
    perRule: samplePerRule,
    totalChanges: 2,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe("AC-001: ZhTypoPreviewModal 展示 diff 预览", () => {
  it("isOpen=true 时 zh-typo-preview-modal 存在于 DOM", async () => {
    const wrapper = mount(ZhTypoPreviewModal, { props: makeProps() });
    await nextTick();
    expect(wrapper.find('[data-testid="zh-typo-preview-modal"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("isOpen=false 时 Modal 不显示", async () => {
    const wrapper = mount(ZhTypoPreviewModal, { props: makeProps({ isOpen: false }) });
    await nextTick();
    expect(wrapper.find('[data-testid="zh-typo-preview-modal"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("显示逐 rule 计数行（zh-en-space: 2）", async () => {
    const wrapper = mount(ZhTypoPreviewModal, { props: makeProps() });
    await nextTick();
    const modalText = wrapper.find('[data-testid="zh-typo-preview-modal"]').text();
    expect(modalText).toContain("zh-en-space");
    expect(modalText).toContain("2");
    wrapper.unmount();
  });

  it("totalChanges 数字显示在 Modal 中", async () => {
    const wrapper = mount(ZhTypoPreviewModal, { props: makeProps() });
    await nextTick();
    const modalText = wrapper.find('[data-testid="zh-typo-preview-modal"]').text();
    expect(modalText).toContain("2");
    wrapper.unmount();
  });

  it("original 文本显示在 diff 对比行中", async () => {
    const wrapper = mount(ZhTypoPreviewModal, { props: makeProps() });
    await nextTick();
    const modalText = wrapper.find('[data-testid="zh-typo-preview-modal"]').text();
    expect(modalText).toContain("这是GitHub的项目");
    wrapper.unmount();
  });

  it("revised 文本显示在 diff 对比行中", async () => {
    const wrapper = mount(ZhTypoPreviewModal, { props: makeProps() });
    await nextTick();
    const modalText = wrapper.find('[data-testid="zh-typo-preview-modal"]').text();
    expect(modalText).toContain("这是 GitHub 的项目");
    wrapper.unmount();
  });

  it("含「确认修订」按钮（zh-typo-confirm）", async () => {
    const wrapper = mount(ZhTypoPreviewModal, { props: makeProps() });
    await nextTick();
    expect(wrapper.find('[data-testid="zh-typo-confirm"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("含「取消」按钮（zh-typo-cancel）", async () => {
    const wrapper = mount(ZhTypoPreviewModal, { props: makeProps() });
    await nextTick();
    expect(wrapper.find('[data-testid="zh-typo-cancel"]').exists()).toBe(true);
    wrapper.unmount();
  });
});

describe("AC-002: 确认修订按钮触发 onConfirm", () => {
  it("点击「确认修订」调用 onConfirm prop", async () => {
    const onConfirm = vi.fn();
    const wrapper = mount(ZhTypoPreviewModal, { props: makeProps({ onConfirm }) });
    await nextTick();
    await wrapper.find('[data-testid="zh-typo-confirm"]').trigger("click");
    await nextTick();
    expect(onConfirm).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("点击「取消」调用 onCancel prop", async () => {
    const onCancel = vi.fn();
    const wrapper = mount(ZhTypoPreviewModal, { props: makeProps({ onCancel }) });
    await nextTick();
    await wrapper.find('[data-testid="zh-typo-cancel"]').trigger("click");
    await nextTick();
    expect(onCancel).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
});

describe("AC-004: totalChanges=0 时仍可取消", () => {
  it("totalChanges=0 且 diff=[] 时 Modal 可显示（无排版问题提示）", async () => {
    const wrapper = mount(ZhTypoPreviewModal, {
      props: makeProps({ diff: [], perRule: {}, totalChanges: 0 }),
    });
    await nextTick();
    expect(wrapper.find('[data-testid="zh-typo-preview-modal"]').exists()).toBe(true);
    wrapper.unmount();
  });
});
