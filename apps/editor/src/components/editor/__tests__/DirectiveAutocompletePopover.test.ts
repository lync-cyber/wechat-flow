import { mount } from "@vue/test-utils";
import type { BlockDefinition, MarkDefinition } from "@wechat-flow/core";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { z } from "zod";
import DirectiveAutocompletePopover from "../DirectiveAutocompletePopover.vue";

const BLOCKS: BlockDefinition[] = [
  {
    id: "callout",
    name: "提示框",
    category: "emphasis",
    attrsSchema: z.object({ text: z.string() }),
    variants: [],
    slots: ["root"],
  },
  {
    id: "heading",
    name: "标题",
    category: "text",
    attrsSchema: z.object({ text: z.string() }),
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
