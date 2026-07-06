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

describe("TemplateThemeCard — 骨架缩略图与主题色", () => {
  it("传入 accentColor 时缩略图容器绑定该色值为 --card-accent", async () => {
    const wrapper = mount(TemplateThemeCard, {
      props: {
        themeId: "magazine",
        themeName: "生活杂志",
        templateId: "tpl-1",
        accentColor: "#E07A2C",
        isActive: false,
        onUseTheme: vi.fn(),
        onUseTemplate: vi.fn(),
      },
    });
    await nextTick();
    const thumbnail = wrapper.find('[data-testid="thumbnail"]');
    expect(thumbnail.attributes("style")).toContain("#E07A2C");
  });

  it("未传 accentColor 时缩略图回退 var(--color-brand)", async () => {
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
    const thumbnail = wrapper.find('[data-testid="thumbnail"]');
    expect(thumbnail.attributes("style")).toContain("var(--color-brand)");
  });

  it("P-003：传入 themeTokens 时缩略图底色取主题 --color-background（暗色主题得暗底）", async () => {
    const wrapper = mount(TemplateThemeCard, {
      props: {
        themeId: "tech",
        themeName: "科技数码",
        templateId: "tpl-1",
        isActive: false,
        themeTokens: {
          "--color-background": "#0F1117",
          "--color-surface": "#161B22",
          "--color-border": "#30363D",
        },
        onUseTheme: vi.fn(),
        onUseTemplate: vi.fn(),
      },
    });
    await nextTick();
    const style = wrapper.find('[data-testid="thumbnail"]').attributes("style") ?? "";
    expect(style).toContain("--thumbnail-bg: #0F1117");
    expect(style).toContain("--thumbnail-surface: #161B22");
    expect(style).toContain("--thumbnail-border: #30363D");
  });

  it("缩略图为装饰性区块，标记 aria-hidden", async () => {
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
    const skeleton = wrapper.find('[data-testid="theme-thumbnail"]');
    expect(skeleton.attributes("aria-hidden")).toBe("true");
  });

  it("isActive=true 时「正在使用」徽章渲染在缩略图容器内部", async () => {
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
    const thumbnail = wrapper.find('[data-testid="thumbnail"]');
    const badge = thumbnail.find('[data-testid="active-badge"]');
    expect(badge.exists()).toBe(true);
  });
});

describe("TemplateThemeCard — 模板名副标题", () => {
  it("传入 templateName 时渲染该模板名行", async () => {
    const wrapper = mount(TemplateThemeCard, {
      props: {
        themeId: "default",
        themeName: "简约通用",
        templateId: "starter",
        templateName: "标准文章",
        isActive: false,
        onUseTheme: vi.fn(),
        onUseTemplate: vi.fn(),
      },
    });
    await nextTick();
    expect(wrapper.text()).toContain("标准文章");
  });

  it("未传 templateName 时不渲染模板名行", async () => {
    const wrapper = mount(TemplateThemeCard, {
      props: {
        themeId: "default",
        themeName: "简约通用",
        templateId: "starter",
        isActive: false,
        onUseTheme: vi.fn(),
        onUseTemplate: vi.fn(),
      },
    });
    await nextTick();
    expect(wrapper.find(".template-theme-card__template-name").exists()).toBe(false);
  });
});
