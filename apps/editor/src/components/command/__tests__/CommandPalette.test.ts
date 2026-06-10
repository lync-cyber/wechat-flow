import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import type { CommandDefinition } from "../../../lib/command-registry.ts";
import CommandPalette from "../CommandPalette.vue";

const mockCommands: CommandDefinition[] = [
  { id: "view-focus", group: "视图", label: "切换专注模式", run: vi.fn() },
  { id: "switch-theme-default", group: "主题", label: "切换至 默认 主题", run: vi.fn() },
  { id: "switch-theme-tech", group: "主题", label: "切换至 科技数码 主题", run: vi.fn() },
  { id: "doc-new", group: "文档", label: "新建文档", run: vi.fn() },
  { id: "export-copy-html", group: "导出", label: "复制 inline HTML", run: vi.fn() },
  { id: "help-shortcuts", group: "帮助", label: "快捷键手册", run: vi.fn() },
];

function mountPalette(isOpen = true, commands = mockCommands) {
  const onClose = vi.fn();
  const onExecute = vi.fn();
  const wrapper = mount(CommandPalette, {
    props: { isOpen, commands, onClose, onExecute },
    attachTo: document.body,
    global: { plugins: [createPinia()] },
  });
  return { wrapper, onClose, onExecute };
}

beforeEach(() => {
  setActivePinia(createPinia());
});

afterEach(() => {
  vi.clearAllMocks();
});

// AC-001: Ctrl+K / Cmd+K 打开，搜索框自动聚焦（动画通过 CSS class 验证）
describe("AC-001: isOpen=true 时面板渲染并含正确 class，搜索框存在", () => {
  it("isOpen=true 时 data-testid=command-palette 存在于 DOM", async () => {
    const { wrapper } = mountPalette(true);
    await nextTick();
    expect(wrapper.find('[data-testid="command-palette"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("面板根元素含 command-palette--open class（动画触发点）", async () => {
    const { wrapper } = mountPalette(true);
    await nextTick();
    const el = wrapper.find('[data-testid="command-palette"]');
    expect(el.classes()).toContain("command-palette--open");
    wrapper.unmount();
  });

  it("isOpen=false 时面板不在 DOM 中", async () => {
    const { wrapper } = mountPalette(false);
    await nextTick();
    expect(wrapper.find('[data-testid="command-palette"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("isOpen=true 时搜索输入框存在（autoFocus 可聚焦）", async () => {
    const { wrapper } = mountPalette(true);
    await nextTick();
    const input = wrapper.find('[data-testid="command-search-input"]');
    expect(input.exists()).toBe(true);
    wrapper.unmount();
  });

  it("搜索输入框 placeholder 为「搜索动作…」", async () => {
    const { wrapper } = mountPalette(true);
    await nextTick();
    const input = wrapper.find('[data-testid="command-search-input"]');
    expect((input.element as HTMLInputElement).placeholder).toBe("搜索动作…");
    wrapper.unmount();
  });
});

// AC-002: 输入过滤 + 匹配高亮
describe("AC-002: 输入「主题」过滤命令列表", () => {
  it("初始状态显示全部命令分组", async () => {
    const { wrapper } = mountPalette(true);
    await nextTick();
    const items = wrapper.findAll('[data-testid^="command-item-"]');
    expect(items.length).toBe(mockCommands.length);
    wrapper.unmount();
  });

  it("输入「主题」后列表仅含 group=主题 或 label 含「主题」的命令", async () => {
    const { wrapper } = mountPalette(true);
    await nextTick();
    const input = wrapper.find('[data-testid="command-search-input"]');
    await input.setValue("主题");
    await nextTick();

    const items = wrapper.findAll('[data-testid^="command-item-"]');
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      const text = item.text();
      const group = item.attributes("data-group") ?? "";
      expect(text.includes("主题") || group.includes("主题")).toBe(true);
    }
    wrapper.unmount();
  });

  it("输入「主题」后匹配文字使用 mark.command-palette__highlight 包裹", async () => {
    const { wrapper } = mountPalette(true);
    await nextTick();
    const input = wrapper.find('[data-testid="command-search-input"]');
    await input.setValue("主题");
    await nextTick();

    const highlights = wrapper.findAll("mark.command-palette__highlight");
    expect(highlights.length).toBeGreaterThan(0);
    for (const h of highlights) {
      expect(h.text()).toBe("主题");
    }
    wrapper.unmount();
  });

  it("无匹配时显示「没有匹配的动作」空状态文字", async () => {
    const { wrapper } = mountPalette(true);
    await nextTick();
    const input = wrapper.find('[data-testid="command-search-input"]');
    await input.setValue("xyznotexist__NONE__");
    await nextTick();

    const empty = wrapper.find('[data-testid="command-empty"]');
    expect(empty.exists()).toBe(true);
    expect(empty.text()).toBe("没有匹配的动作");
    wrapper.unmount();
  });
});

// AC-003: 选中并 Enter 执行 → onExecute 被调用
describe("AC-003: 选中命令并 Enter 执行", () => {
  it("Enter 键触发第一个可见命令的 onExecute 回调，传入 CommandDefinition", async () => {
    const { wrapper, onExecute } = mountPalette(true);
    await nextTick();

    const palette = wrapper.find('[data-testid="command-palette"]').element as HTMLElement;
    palette.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
    );
    await nextTick();

    expect(onExecute).toHaveBeenCalledTimes(1);
    const arg = onExecute.mock.calls[0][0] as CommandDefinition;
    expect(typeof arg.id).toBe("string");
    expect(typeof arg.run).toBe("function");
    wrapper.unmount();
  });

  it("ArrowDown 移动选中项，Enter 执行第二条命令", async () => {
    const { wrapper, onExecute } = mountPalette(true);
    await nextTick();

    const palette = wrapper.find('[data-testid="command-palette"]').element as HTMLElement;
    palette.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true })
    );
    await nextTick();
    palette.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
    );
    await nextTick();

    expect(onExecute).toHaveBeenCalledTimes(1);
    const arg = onExecute.mock.calls[0][0] as CommandDefinition;
    expect(arg.id).toBe(mockCommands[1].id);
    wrapper.unmount();
  });

  it("点击命令项直接触发 onExecute", async () => {
    const { wrapper, onExecute } = mountPalette(true);
    await nextTick();

    const firstItem = wrapper.find('[data-testid^="command-item-"]');
    expect(firstItem.exists()).toBe(true);
    await firstItem.trigger("click");
    await nextTick();

    expect(onExecute).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("执行后面板自动关闭（onClose 被调用）", async () => {
    const { wrapper, onClose } = mountPalette(true);
    await nextTick();

    const palette = wrapper.find('[data-testid="command-palette"]').element as HTMLElement;
    palette.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
    );
    await nextTick();

    expect(onClose).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});

// AC-004: Esc 键关闭面板
describe("AC-004: Esc 键关闭 CommandPalette", () => {
  it("面板打开时按 Esc 触发 onClose 回调", async () => {
    const { wrapper, onClose } = mountPalette(true);
    await nextTick();

    const palette = wrapper.find('[data-testid="command-palette"]').element as HTMLElement;
    palette.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
    );
    await nextTick();

    expect(onClose).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("点击 overlay 遮罩触发 onClose", async () => {
    const { wrapper, onClose } = mountPalette(true);
    await nextTick();

    const overlay = wrapper.find('[data-testid="command-palette-overlay"]');
    expect(overlay.exists()).toBe(true);
    await overlay.trigger("click");
    await nextTick();

    expect(onClose).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});

// 底部快捷键提示行
describe("底部快捷键提示行", () => {
  it("显示导航/执行/关闭提示文字", async () => {
    const { wrapper } = mountPalette(true);
    await nextTick();
    const footer = wrapper.find('[data-testid="command-palette-footer"]');
    expect(footer.exists()).toBe(true);
    const text = footer.text();
    expect(text).toContain("↑↓");
    expect(text).toContain("Esc");
    wrapper.unmount();
  });
});

// 分组标题
describe("命令分组标题渲染", () => {
  it("每个分组都有对应的 data-testid=group-title-{group} 元素", async () => {
    const { wrapper } = mountPalette(true);
    await nextTick();
    const groups = new Set(mockCommands.map((c) => c.group));
    for (const group of groups) {
      const title = wrapper.find(`[data-testid="group-title-${group}"]`);
      expect(title.exists()).toBe(true);
    }
    wrapper.unmount();
  });
});
