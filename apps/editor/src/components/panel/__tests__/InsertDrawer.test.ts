import { mount } from "@vue/test-utils";
import { listBlocks, registerBlock, resetBlockRegistry } from "@wechat-flow/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { z } from "zod";
import InsertDrawer from "../InsertDrawer.vue";

afterEach(() => {
  resetBlockRegistry();
});

const makeBlocks = () => {
  registerBlock({
    id: "callout",
    name: "提示框",
    attrsSchema: z.object({
      type: z.enum(["info", "warning", "success", "error"]).default("info"),
      text: z.string(),
      title: z.string().optional(),
    }),
    variants: [{ id: "default", label: "默认提示" }],
    slots: ["root"],
  });
  registerBlock({
    id: "heading",
    name: "标题",
    attrsSchema: z.object({
      level: z.number().int().min(1).max(6).default(2),
      text: z.string(),
    }),
    variants: [],
    slots: ["root"],
  });
};

const defaultProps = () => ({
  isOpen: true,
  onInsert: vi.fn(),
  onClose: vi.fn(),
});

describe("AC-001: InsertDrawer 从右侧滑入，宽 320px 并含分类 Tab + Block 列表", () => {
  beforeEach(() => {
    makeBlocks();
  });

  it("isOpen=true 时渲染 insert-drawer 容器，宽度样式含 320px", async () => {
    const wrapper = mount(InsertDrawer, { props: defaultProps() });
    await nextTick();

    const drawer = wrapper.find('[data-testid="insert-drawer"]');
    expect(drawer.exists()).toBe(true);
    const style = (drawer.element as HTMLElement).style.width;
    expect(style).toBe("320px");
    wrapper.unmount();
  });

  it("isOpen=false 时抽屉不可见（aria-hidden 或 DOM 不存在）", async () => {
    const wrapper = mount(InsertDrawer, {
      props: { ...defaultProps(), isOpen: false },
    });
    await nextTick();

    const drawer = wrapper.find('[data-testid="insert-drawer"]');
    const visible = drawer.exists() && drawer.attributes("aria-hidden") !== "true";
    expect(visible).toBe(false);
    wrapper.unmount();
  });

  it("isOpen=true 时标题行含「插入组件」文字", async () => {
    const wrapper = mount(InsertDrawer, { props: defaultProps() });
    await nextTick();

    const header = wrapper.find('[data-testid="insert-drawer-header"]');
    expect(header.exists()).toBe(true);
    expect(header.text()).toContain("插入组件");
    wrapper.unmount();
  });

  it("标题行含关闭按钮，点击触发 onClose", async () => {
    const onClose = vi.fn();
    const wrapper = mount(InsertDrawer, {
      props: { ...defaultProps(), onClose },
    });
    await nextTick();

    await wrapper.find('[data-testid="insert-drawer-close"]').trigger("click");
    await nextTick();

    expect(onClose).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("渲染注册中心所有 Block，每条对应一个 data-testid=block-lib-item", async () => {
    const wrapper = mount(InsertDrawer, { props: defaultProps() });
    await nextTick();

    const blocks = listBlocks();
    const items = wrapper.findAll('[data-testid="block-lib-item"]');
    expect(items.length).toBe(blocks.length);
    wrapper.unmount();
  });
});

describe("AC-002: 选中 Block 展开参数表单，点击「插入」生成 directive 片段并调用 onInsert", () => {
  beforeEach(() => {
    makeBlocks();
  });

  it("未选中任何 Block 时底部参数表单区不显示", async () => {
    const wrapper = mount(InsertDrawer, { props: defaultProps() });
    await nextTick();

    expect(wrapper.find('[data-testid="insert-drawer-params"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("点击 callout Block 后底部参数表单区出现", async () => {
    const wrapper = mount(InsertDrawer, { props: defaultProps() });
    await nextTick();

    const items = wrapper.findAll('[data-testid="block-lib-item"]');
    expect(items.length).toBeGreaterThan(0);
    await items[0].trigger("click");
    await nextTick();

    expect(wrapper.find('[data-testid="insert-drawer-params"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("参数表单区含「插入」按钮", async () => {
    const wrapper = mount(InsertDrawer, { props: defaultProps() });
    await nextTick();

    const items = wrapper.findAll('[data-testid="block-lib-item"]');
    await items[0].trigger("click");
    await nextTick();

    expect(wrapper.find('[data-testid="insert-drawer-submit"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("点击「插入」按钮后 onInsert 以含 blockId 的 directive 语法字符串调用", async () => {
    const onInsert = vi.fn();
    const wrapper = mount(InsertDrawer, {
      props: { ...defaultProps(), onInsert },
    });
    await nextTick();

    const items = wrapper.findAll('[data-testid="block-lib-item"]');
    await items[0].trigger("click");
    await nextTick();

    await wrapper.find('[data-testid="insert-drawer-submit"]').trigger("click");
    await nextTick();

    expect(onInsert).toHaveBeenCalledOnce();
    const [directive] = onInsert.mock.calls[0] as [string];
    expect(typeof directive).toBe("string");
    expect(directive.length).toBeGreaterThan(0);
    expect(directive).toMatch(/:::/);
    wrapper.unmount();
  });

  it("生成的 directive 片段含选中 Block 的 id（callout）", async () => {
    const onInsert = vi.fn();
    const wrapper = mount(InsertDrawer, {
      props: { ...defaultProps(), onInsert },
    });
    await nextTick();

    const items = wrapper.findAll('[data-testid="block-lib-item"]');
    await items[0].trigger("click");
    await nextTick();

    await wrapper.find('[data-testid="insert-drawer-submit"]').trigger("click");
    await nextTick();

    const [directive] = onInsert.mock.calls[0] as [string];
    expect(directive).toContain("callout");
    wrapper.unmount();
  });
});
