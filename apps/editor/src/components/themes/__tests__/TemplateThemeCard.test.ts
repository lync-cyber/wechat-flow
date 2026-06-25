import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import TemplateThemeCard from "../TemplateThemeCard.vue";

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("TemplateThemeCard — AC-002: 正在使用徽章", () => {
  it("isActive=true 时渲染「正在使用」徽章", async () => {
    const wrapper = mount(TemplateThemeCard, {
      props: {
        themeId: "default",
        themeName: "简约通用",
        templateId: "tpl-1",
        templateDescription: "示例",
        isActive: true,
        onUseTheme: vi.fn(),
        onUseTemplate: vi.fn(),
      },
    });
    await nextTick();
    const badge = wrapper.find('[data-testid="active-badge"]');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toContain("正在使用");
  });

  it("isActive=true 时卡片含 --color-brand-subtle 绑定 class", async () => {
    const wrapper = mount(TemplateThemeCard, {
      props: {
        themeId: "default",
        themeName: "简约通用",
        templateId: "tpl-1",
        isActive: true,
        onUseTheme: vi.fn(),
        onUseTemplate: vi.fn(),
      },
    });
    await nextTick();
    const card = wrapper.find('[data-testid="template-theme-card"]');
    expect(card.classes()).toContain("template-theme-card--active");
  });

  it("isActive=false 时无「正在使用」徽章", async () => {
    const wrapper = mount(TemplateThemeCard, {
      props: {
        themeId: "default",
        themeName: "简约通用",
        templateId: "tpl-1",
        isActive: false,
        onUseTheme: vi.fn(),
        onUseTemplate: vi.fn(),
      },
    });
    await nextTick();
    expect(wrapper.find('[data-testid="active-badge"]').exists()).toBe(false);
  });
});

describe("TemplateThemeCard — AC-003: 使用此主题", () => {
  it("点击「使用此主题」按钮调用 onUseTheme(themeId, themeName)", async () => {
    const onUseTheme = vi.fn();
    const wrapper = mount(TemplateThemeCard, {
      props: {
        themeId: "magazine",
        themeName: "生活杂志",
        templateId: "tpl-1",
        isActive: false,
        onUseTheme,
        onUseTemplate: vi.fn(),
      },
    });
    await nextTick();
    await wrapper.find('[data-testid="btn-use-theme-magazine"]').trigger("click");
    await nextTick();
    expect(onUseTheme).toHaveBeenCalledWith("magazine", "生活杂志");
  });
});

describe("TemplateThemeCard — AC-004: 使用此模板", () => {
  it("点击「使用此模板」按钮调用 onUseTemplate(themeId, templateId)", async () => {
    const onUseTemplate = vi.fn();
    const wrapper = mount(TemplateThemeCard, {
      props: {
        themeId: "default",
        themeName: "简约通用",
        templateId: "tpl-general",
        isActive: false,
        onUseTheme: vi.fn(),
        onUseTemplate,
      },
    });
    await nextTick();
    await wrapper.find('[data-testid="btn-use-template-default-tpl-general"]').trigger("click");
    await nextTick();
    expect(onUseTemplate).toHaveBeenCalledWith("default", "tpl-general");
  });
});

describe("TemplateThemeCard — 内容渲染", () => {
  it("渲染主题名和 template 描述", async () => {
    const wrapper = mount(TemplateThemeCard, {
      props: {
        themeId: "default",
        themeName: "简约通用",
        templateId: "tpl-1",
        templateDescription: "通用文章模板",
        isActive: false,
        onUseTheme: vi.fn(),
        onUseTemplate: vi.fn(),
      },
    });
    await nextTick();
    expect(wrapper.text()).toContain("简约通用");
    expect(wrapper.text()).toContain("通用文章模板");
  });

  it("含缩略图区（data-testid=thumbnail）", async () => {
    const wrapper = mount(TemplateThemeCard, {
      props: {
        themeId: "default",
        themeName: "简约通用",
        templateId: "tpl-1",
        isActive: false,
        onUseTheme: vi.fn(),
        onUseTemplate: vi.fn(),
      },
    });
    await nextTick();
    expect(wrapper.find('[data-testid="thumbnail"]').exists()).toBe(true);
  });
});
