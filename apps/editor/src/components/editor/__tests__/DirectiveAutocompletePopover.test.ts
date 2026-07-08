import { mount } from "@vue/test-utils";
import type { BlockDefinition, MarkDefinition } from "@wechat-flow/core";
import { describeBlock, resetBlockRegistry } from "@wechat-flow/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { z } from "zod";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "../../panel/category-labels.ts";
import DirectiveAutocompletePopover from "../DirectiveAutocompletePopover.vue";

const BLOCKS: BlockDefinition[] = [
  {
    id: "callout",
    name: "提示框",
    category: "emphasis",
    directiveAttrs: z.object({ text: z.string() }),
    variants: [],
    slots: ["root"],
  },
  {
    id: "heading",
    name: "标题",
    category: "text",
    directiveAttrs: z.object({ text: z.string() }),
    variants: [],
    slots: ["root"],
  },
  {
    id: "quote",
    name: "引用",
    category: "text",
    directiveAttrs: z.object({ text: z.string() }),
    variants: [],
    slots: ["root"],
  },
];

const MARKS: MarkDefinition[] = [{ id: "bold", name: "加粗", style: "font-weight: bold" }];

const defaultProps = () => ({
  isOpen: true,
  triggerType: "block" as const,
  blocks: BLOCKS,
  marks: MARKS,
  currentInput: "",
  onSelect: vi.fn(),
  onClose: vi.fn(),
});

describe("UC-021 守护: block/inline 触发类型行为不因 UC-015 InsertDrawer 分类改造回归", () => {
  it("triggerType=block 打开时默认激活 block Tab 并列出全部 block 候选", async () => {
    const wrapper = mount(DirectiveAutocompletePopover, { props: defaultProps() });
    await nextTick();

    const blockTab = wrapper.find('[data-testid="autocomplete-tab-block"]');
    expect(blockTab.exists()).toBe(true);
    expect(blockTab.classes()).toContain("dap__tab--active");

    const items = wrapper.findAll('[data-testid="autocomplete-item"]');
    expect(items.length).toBe(BLOCKS.length);
    wrapper.unmount();
  });

  it("triggerType=inline 打开时默认激活 inline Tab 并列出全部 mark 候选", async () => {
    const wrapper = mount(DirectiveAutocompletePopover, {
      props: { ...defaultProps(), triggerType: "inline" },
    });
    await nextTick();

    const inlineTab = wrapper.find('[data-testid="autocomplete-tab-inline"]');
    expect(inlineTab.exists()).toBe(true);
    expect(inlineTab.classes()).toContain("dap__tab--active");

    const items = wrapper.findAll('[data-testid="autocomplete-item"]');
    expect(items.length).toBe(MARKS.length);
    wrapper.unmount();
  });
});

describe("UC-021 分类标签行: 数据驱动派生、点击过滤、与搜索叠加", () => {
  it("triggerType=block 时渲染分类标签行，标签集合仅含 blocks 实际出现的 category（顺序=CATEGORY_ORDER）", async () => {
    const wrapper = mount(DirectiveAutocompletePopover, { props: defaultProps() });
    await nextTick();

    const row = wrapper.find('[data-testid="autocomplete-category-row"]');
    expect(row.exists()).toBe(true);

    const present = new Set(BLOCKS.map((b) => b.category));
    const expectedOrder = CATEGORY_ORDER.filter((c) => present.has(c));
    const tabs = wrapper.findAll('[data-testid^="autocomplete-category-tab-"]');
    const order = tabs.map((t) =>
      t.attributes("data-testid")?.replace("autocomplete-category-tab-", "")
    );
    expect(order).toEqual(expectedOrder);
    wrapper.unmount();
  });

  it("分类标签文案取自与 UC-015 共用的 CATEGORY_LABELS 映射", async () => {
    const wrapper = mount(DirectiveAutocompletePopover, { props: defaultProps() });
    await nextTick();

    const textTab = wrapper.find('[data-testid="autocomplete-category-tab-text"]');
    expect(textTab.exists()).toBe(true);
    expect(textTab.text()).toContain(CATEGORY_LABELS.text);

    const emphasisTab = wrapper.find('[data-testid="autocomplete-category-tab-emphasis"]');
    expect(emphasisTab.exists()).toBe(true);
    expect(emphasisTab.text()).toContain(CATEGORY_LABELS.emphasis);
    wrapper.unmount();
  });

  it("分类标签行高 32px", async () => {
    const wrapper = mount(DirectiveAutocompletePopover, { props: defaultProps() });
    await nextTick();

    const row = wrapper.find('[data-testid="autocomplete-category-row"]');
    const el = row.element as HTMLElement;
    const height = el.style.height || getComputedStyle(el).height;
    expect(height).toBe("32px");
    wrapper.unmount();
  });

  it("默认不过滤分类，列表显示全部 block 候选", async () => {
    const wrapper = mount(DirectiveAutocompletePopover, { props: defaultProps() });
    await nextTick();

    const items = wrapper.findAll('[data-testid="autocomplete-item"]');
    expect(items.length).toBe(BLOCKS.length);
    wrapper.unmount();
  });

  it("点击某分类标签后列表仅显示该分类 block，标签呈激活态", async () => {
    const wrapper = mount(DirectiveAutocompletePopover, { props: defaultProps() });
    await nextTick();

    await wrapper.find('[data-testid="autocomplete-category-tab-text"]').trigger("click");
    await nextTick();

    const textTab = wrapper.find('[data-testid="autocomplete-category-tab-text"]');
    expect(textTab.classes()).toContain("dap__category-tab--active");

    const items = wrapper.findAll('[data-testid="autocomplete-item"]');
    expect(items.length).toBe(2);
    const names = items.map((i) => i.text());
    expect(names.some((n) => n.includes("标题"))).toBe(true);
    expect(names.some((n) => n.includes("引用"))).toBe(true);
    expect(names.some((n) => n.includes("提示框"))).toBe(false);
    wrapper.unmount();
  });

  it("再次点击已激活分类标签取消过滤，恢复全量列表", async () => {
    const wrapper = mount(DirectiveAutocompletePopover, { props: defaultProps() });
    await nextTick();

    await wrapper.find('[data-testid="autocomplete-category-tab-text"]').trigger("click");
    await nextTick();
    expect(wrapper.findAll('[data-testid="autocomplete-item"]').length).toBe(2);

    await wrapper.find('[data-testid="autocomplete-category-tab-text"]').trigger("click");
    await nextTick();

    const textTab = wrapper.find('[data-testid="autocomplete-category-tab-text"]');
    expect(textTab.classes()).not.toContain("dap__category-tab--active");
    expect(wrapper.findAll('[data-testid="autocomplete-item"]').length).toBe(BLOCKS.length);
    wrapper.unmount();
  });

  it("分类过滤与搜索框过滤叠加生效（AND 语义）", async () => {
    const wrapper = mount(DirectiveAutocompletePopover, {
      props: { ...defaultProps(), currentInput: "引用" },
    });
    await nextTick();

    await wrapper.find('[data-testid="autocomplete-category-tab-text"]').trigger("click");
    await nextTick();

    const items = wrapper.findAll('[data-testid="autocomplete-item"]');
    expect(items.length).toBe(1);
    expect(items[0]?.text()).toContain("引用");
    wrapper.unmount();
  });

  it("triggerType=inline 时不渲染分类标签行（marks 无 category 维度）", async () => {
    const wrapper = mount(DirectiveAutocompletePopover, {
      props: { ...defaultProps(), triggerType: "inline" },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="autocomplete-category-row"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("从 block 切到 inline 再切回 block 时分类过滤态被重置为不过滤", async () => {
    const wrapper = mount(DirectiveAutocompletePopover, { props: defaultProps() });
    await nextTick();

    await wrapper.find('[data-testid="autocomplete-category-tab-text"]').trigger("click");
    await nextTick();
    expect(wrapper.findAll('[data-testid="autocomplete-item"]').length).toBe(2);

    await wrapper.setProps({ triggerType: "inline" });
    await nextTick();
    await wrapper.setProps({ triggerType: "block" });
    await nextTick();

    expect(wrapper.findAll('[data-testid="autocomplete-item"]').length).toBe(BLOCKS.length);
    wrapper.unmount();
  });
});

describe("T-165 AC-003: shape 字段提取收敛为共用 util，Popover 显示与 directiveAttrs.shape 一致（真实内置 Block）", () => {
  beforeEach(async () => {
    resetBlockRegistry();
    await import("@wechat-flow/blocks");
  });

  it("选中 dialog 后二级参数区显示的字段集合与 directiveAttrs.shape 键集合一致（speaker/avatar）", async () => {
    const dialogBlock = describeBlock("dialog");
    if (!dialogBlock) throw new Error("dialog not registered");

    const wrapper = mount(DirectiveAutocompletePopover, {
      props: { ...defaultProps(), blocks: [dialogBlock], marks: [] },
    });
    await nextTick();

    await wrapper.find('[data-testid="autocomplete-item"]').trigger("click");
    await nextTick();

    const shapeKeys = Object.keys(
      (dialogBlock.directiveAttrs as unknown as { shape: Record<string, unknown> }).shape
    );
    const fields = wrapper
      .findAll('[data-testid^="autocomplete-param-"]')
      .map((el) => el.attributes("data-testid")?.replace("autocomplete-param-", ""));
    expect(fields).toEqual(shapeKeys);
    wrapper.unmount();
  });

  it("选中 callout（空 directiveAttrs）后不显示参数区", async () => {
    const calloutBlock = describeBlock("callout");
    if (!calloutBlock) throw new Error("callout not registered");

    const wrapper = mount(DirectiveAutocompletePopover, {
      props: { ...defaultProps(), blocks: [calloutBlock], marks: [] },
    });
    await nextTick();

    await wrapper.find('[data-testid="autocomplete-item"]').trigger("click");
    await nextTick();

    expect(wrapper.find('[data-testid="autocomplete-params"]').exists()).toBe(false);
    wrapper.unmount();
  });
});
