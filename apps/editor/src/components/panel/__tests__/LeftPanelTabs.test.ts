import { mount } from "@vue/test-utils";
import { resetBlockRegistry } from "@wechat-flow/core/src/registry/block.ts";
import { registerTheme, resetThemeRegistry } from "@wechat-flow/core/src/registry/theme.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import { z } from "zod";
import BlockLibItem from "../BlockLibItem.vue";
import LeftPanelTabs from "../LeftPanelTabs.vue";
import ThemeCard from "../ThemeCard.vue";

function makeRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: "/", component: { template: "<div/>" } },
      { path: "/themes", component: { template: "<div/>" } },
    ],
  });
}

afterEach(() => {
  resetThemeRegistry();
  resetBlockRegistry();
});

describe("AC-001: 主题 Tab 激活态 + ThemeCard 列表", () => {
  beforeEach(() => {
    resetThemeRegistry();
    registerTheme({ id: "default", name: "简约通用", tokens: {}, paintable: {}, assets: {} });
    registerTheme({ id: "elegant", name: "文艺雅典", tokens: {}, paintable: {}, assets: {} });
  });

  it("默认激活主题 Tab 时，Tab 标题具有 active 指示线 class", async () => {
    const wrapper = mount(LeftPanelTabs, {
      props: { defaultTab: "theme" },
      global: { plugins: [makeRouter()] },
    });
    await nextTick();

    const activeTab = wrapper.find('[data-testid="tab-theme"]');
    expect(activeTab.classes()).toContain("left-panel-tabs__tab--active");
  });

  it("主题 Tab 内容区渲染所有已注册主题的 ThemeCard", async () => {
    const wrapper = mount(LeftPanelTabs, {
      props: { defaultTab: "theme" },
      global: { plugins: [makeRouter()] },
    });
    await nextTick();

    const cards = wrapper.findAll('[data-testid^="theme-card-"]');
    expect(cards.length).toBe(2);
  });

  it("点击「组件」Tab 后，「主题」Tab 失去 active class，「组件」Tab 获得 active class", async () => {
    const wrapper = mount(LeftPanelTabs, {
      props: { defaultTab: "theme" },
      global: { plugins: [makeRouter()] },
    });
    await nextTick();

    await wrapper.find('[data-testid="tab-components"]').trigger("click");
    await nextTick();

    expect(wrapper.find('[data-testid="tab-theme"]').classes()).not.toContain(
      "left-panel-tabs__tab--active"
    );
    expect(wrapper.find('[data-testid="tab-components"]').classes()).toContain(
      "left-panel-tabs__tab--active"
    );
  });

  it("点击「组件」Tab 后 onTabChange 回调以 'components' 调用", async () => {
    const onTabChange = vi.fn();
    const wrapper = mount(LeftPanelTabs, {
      props: { defaultTab: "theme", onTabChange },
      global: { plugins: [makeRouter()] },
    });
    await nextTick();

    await wrapper.find('[data-testid="tab-components"]').trigger("click");
    await nextTick();

    expect(onTabChange).toHaveBeenCalledWith("components");
  });

  it("主题 Tab 下方渲染「自定义配色」和「调色板派生」两个链接", async () => {
    const wrapper = mount(LeftPanelTabs, {
      props: { defaultTab: "theme" },
      global: { plugins: [makeRouter()] },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="link-custom-color"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="link-palette-derive"]').exists()).toBe(true);
  });
});

describe("AC-002: ThemeCard selected 态", () => {
  it("isSelected=true 时卡片有 theme-card--selected class（对应 2px solid --color-brand 边框）", async () => {
    const theme = { id: "default", name: "简约通用", tokens: {} };
    const wrapper = mount(ThemeCard, {
      props: { theme, isSelected: true, onSelect: vi.fn() },
      global: { plugins: [makeRouter()] },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="theme-card"]').classes()).toContain("theme-card--selected");
  });

  it("isSelected=true 时渲染对勾图标（data-testid=check-icon）", async () => {
    const theme = { id: "default", name: "简约通用", tokens: {} };
    const wrapper = mount(ThemeCard, {
      props: { theme, isSelected: true, onSelect: vi.fn() },
      global: { plugins: [makeRouter()] },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="check-icon"]').exists()).toBe(true);
  });

  it("isSelected=false 时无对勾图标且无 selected class", async () => {
    const theme = { id: "default", name: "简约通用", tokens: {} };
    const wrapper = mount(ThemeCard, {
      props: { theme, isSelected: false, onSelect: vi.fn() },
      global: { plugins: [makeRouter()] },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="check-icon"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="theme-card"]').classes()).not.toContain(
      "theme-card--selected"
    );
  });

  it("点击卡片时 onSelect 以主题 id 调用", async () => {
    const onSelect = vi.fn();
    const theme = { id: "default", name: "简约通用", tokens: {} };
    const wrapper = mount(ThemeCard, {
      props: { theme, isSelected: false, onSelect },
      global: { plugins: [makeRouter()] },
    });
    await nextTick();

    await wrapper.find('[data-testid="theme-card"]').trigger("click");
    await nextTick();

    expect(onSelect).toHaveBeenCalledWith("default");
  });
});

describe("AC-003: ThemeCard placeholder 态", () => {
  it("isPlaceholder=true 时卡片有 theme-card--placeholder class（opacity 0.6）", async () => {
    const theme = { id: "coming-soon", name: "更多主题", tokens: {} };
    const wrapper = mount(ThemeCard, {
      props: { theme, isSelected: false, isPlaceholder: true, onSelect: vi.fn() },
      global: { plugins: [makeRouter()] },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="theme-card"]').classes()).toContain(
      "theme-card--placeholder"
    );
  });

  it("isPlaceholder=true 时缩略图替换为占位文字「更多主题即将上线」", async () => {
    const theme = { id: "coming-soon", name: "更多主题", tokens: {} };
    const wrapper = mount(ThemeCard, {
      props: { theme, isSelected: false, isPlaceholder: true, onSelect: vi.fn() },
      global: { plugins: [makeRouter()] },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="placeholder-text"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="placeholder-text"]').text()).toContain("更多主题即将上线");
  });

  it("isPlaceholder=true 时点击跳转 /themes 路由", async () => {
    const theme = { id: "coming-soon", name: "更多主题", tokens: {} };
    const router = makeRouter();
    const wrapper = mount(ThemeCard, {
      props: { theme, isSelected: false, isPlaceholder: true, onSelect: vi.fn() },
      global: { plugins: [router] },
    });
    await nextTick();

    const link = wrapper.find('[data-testid="placeholder-link"]');
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toContain("/themes");
  });
});

describe("AC-004: BlockLibItem onInsert 回调", () => {
  it("点击 BlockLibItem 时 onInsert 以 BlockDefinition 参数调用", async () => {
    const block = { id: "heading", name: "标题", attrsSchema: z.object({}), variants: [] };
    const onInsert = vi.fn();
    const wrapper = mount(BlockLibItem, {
      props: { block, onInsert },
    });
    await nextTick();

    await wrapper.find('[data-testid="block-lib-item"]').trigger("click");
    await nextTick();

    expect(onInsert).toHaveBeenCalledOnce();
    expect(onInsert).toHaveBeenCalledWith(block);
  });

  it("BlockLibItem 渲染 block 名称文字", async () => {
    const block = {
      id: "heading",
      name: "标题块",
      attrsSchema: z.object({}),
      variants: [
        { id: "v1", label: "皮肤1" },
        { id: "v2", label: "皮肤2" },
      ],
    };
    const onInsert = vi.fn();
    const wrapper = mount(BlockLibItem, {
      props: { block, onInsert },
    });
    await nextTick();

    const nameEl = wrapper.find('[data-testid="block-name"]');
    expect(nameEl.text()).toBe("标题块");
  });

  it("BlockLibItem variants 数量 > 0 时渲染角标文字", async () => {
    const block = {
      id: "heading",
      name: "标题",
      attrsSchema: z.object({}),
      variants: [{ id: "v1" }, { id: "v2" }, { id: "v3" }],
    };
    const onInsert = vi.fn();
    const wrapper = mount(BlockLibItem, {
      props: { block, onInsert },
    });
    await nextTick();

    const badge = wrapper.find('[data-testid="variant-badge"]');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toContain("3");
  });
});
