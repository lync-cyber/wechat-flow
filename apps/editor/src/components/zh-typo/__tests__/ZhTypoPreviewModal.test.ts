import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import ZhTypoPreviewModal from "../ZhTypoPreviewModal.vue";

const sampleOriginal = '今天天气晴.\n使用Vue3开发\n他说"你好".';
const sampleRevised = "今天天气晴。\n使用 Vue3 开发\n他说“你好”。";
const samplePerRule = { "zh-en-space": 2, "fullwidth-punctuation": 5, "smart-quotes": 2 };

function makeProps(overrides = {}) {
  return {
    isOpen: true,
    original: sampleOriginal,
    revised: sampleRevised,
    perRule: samplePerRule,
    totalChanges: 9,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe("AC-001: ZhTypoPreviewModal 双栏对比 + 分类侧栏", () => {
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

  it("原文栏展示原始文本", async () => {
    const wrapper = mount(ZhTypoPreviewModal, { props: makeProps() });
    await nextTick();
    const col = wrapper.find('[data-testid="zh-typo-col-original"]');
    expect(col.exists()).toBe(true);
    expect(col.text()).toContain("今天天气晴.");
    expect(col.text()).toContain("使用Vue3开发");
    wrapper.unmount();
  });

  it("修订后栏展示修订文本", async () => {
    const wrapper = mount(ZhTypoPreviewModal, { props: makeProps() });
    await nextTick();
    const col = wrapper.find('[data-testid="zh-typo-col-revised"]');
    expect(col.exists()).toBe(true);
    expect(col.text()).toContain("今天天气晴。");
    expect(col.text()).toContain("使用 Vue3 开发");
    wrapper.unmount();
  });

  it("修订后栏中变更行带 changed 标记", async () => {
    const wrapper = mount(ZhTypoPreviewModal, { props: makeProps() });
    await nextTick();
    const changed = wrapper
      .find('[data-testid="zh-typo-col-revised"]')
      .findAll('[data-changed="true"]');
    expect(changed.length).toBeGreaterThan(0);
    wrapper.unmount();
  });

  it("侧栏以中文分类名展示逐类计数（中英文空格 / 全半角标点 / 智能引号）", async () => {
    const wrapper = mount(ZhTypoPreviewModal, { props: makeProps() });
    await nextTick();
    const sidebar = wrapper.find('[data-testid="zh-typo-sidebar"]');
    expect(sidebar.text()).toContain("中英文空格");
    expect(sidebar.text()).toContain("全半角标点");
    expect(sidebar.text()).toContain("智能引号");
    // 计数以「N 处」形式呈现
    expect(sidebar.find('[data-testid="zh-typo-cat-zh-en-space"]').text()).toContain("2");
    wrapper.unmount();
  });

  it("含「应用修订」按钮（zh-typo-confirm）与「取消」按钮（zh-typo-cancel）", async () => {
    const wrapper = mount(ZhTypoPreviewModal, { props: makeProps() });
    await nextTick();
    const confirm = wrapper.find('[data-testid="zh-typo-confirm"]');
    expect(confirm.exists()).toBe(true);
    expect(confirm.text()).toContain("应用修订");
    expect(wrapper.find('[data-testid="zh-typo-cancel"]').exists()).toBe(true);
    wrapper.unmount();
  });
});

describe("AC-002: 应用修订 / 取消按钮回调", () => {
  it("点击「应用修订」调用 onConfirm prop", async () => {
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

describe("AC-004: totalChanges=0 时空态", () => {
  it("totalChanges=0 时展示「文档排版规范，无需修订」空态，双栏不渲染", async () => {
    const wrapper = mount(ZhTypoPreviewModal, {
      props: makeProps({ original: "已规范", revised: "已规范", perRule: {}, totalChanges: 0 }),
    });
    await nextTick();
    expect(wrapper.find('[data-testid="zh-typo-preview-modal"]').exists()).toBe(true);
    const empty = wrapper.find('[data-testid="zh-typo-empty"]');
    expect(empty.exists()).toBe(true);
    expect(empty.text()).toContain("文档排版规范，无需修订");
    expect(wrapper.find('[data-testid="zh-typo-col-original"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("空态下仍可取消", async () => {
    const onCancel = vi.fn();
    const wrapper = mount(ZhTypoPreviewModal, {
      props: makeProps({ original: "", revised: "", perRule: {}, totalChanges: 0, onCancel }),
    });
    await nextTick();
    await wrapper.find('[data-testid="zh-typo-cancel"]').trigger("click");
    expect(onCancel).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
});
