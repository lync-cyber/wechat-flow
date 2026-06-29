import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

// Mock @wechat-flow/core theme/template APIs for isolated, controllable tests
vi.mock("@wechat-flow/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@wechat-flow/core")>();
  return {
    ...actual,
    listThemes: vi.fn(() => [
      { id: "default", name: "简约通用" },
      { id: "magazine", name: "生活杂志" },
      { id: "literary", name: "文艺人文" },
      { id: "business", name: "商业财经" },
      { id: "tech", name: "科技数码" },
    ]),
    listThemeTemplates: vi.fn((themeId: string) => {
      const map: Record<string, { templateId: string; description: string | undefined }[]> = {
        default: [{ templateId: "tpl-general", description: "通用文章" }],
        magazine: [{ templateId: "tpl-life", description: "生活随笔" }],
        literary: [{ templateId: "tpl-prose", description: "散文" }],
        business: [{ templateId: "tpl-report", description: "商业报告" }],
        tech: [{ templateId: "tpl-tech", description: "技术文章" }],
      };
      return map[themeId] ?? [];
    }),
    describeTemplate: vi.fn((themeId: string, templateId: string) => ({
      themeId,
      templateId,
      markdown: `# ${templateId} template markdown`,
      metadata: { description: "test" },
    })),
  };
});

const pushToast = vi.fn();
vi.mock("../../composables/use-toast.ts", () => ({
  useToast: () => ({
    toasts: { value: [] },
    pushToast,
    dismissToast: vi.fn(),
  }),
}));

import ThemesPage from "../ThemesPage.vue";

beforeEach(() => {
  setActivePinia(createPinia());
  pushToast.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AC-001: /themes 页渲染 ≥5 张 TemplateThemeCard", () => {
  it("页面加载后显示 ≥5 张 TemplateThemeCard（以 (themeId,templateId) 为组合）", async () => {
    const wrapper = mount(ThemesPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    const cards = wrapper.findAll('[data-testid^="template-theme-card-"]');
    expect(cards.length).toBeGreaterThanOrEqual(5);
  });

  it("每张卡含缩略图区", async () => {
    const wrapper = mount(ThemesPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    const thumbnails = wrapper.findAll('[data-testid="thumbnail"]');
    expect(thumbnails.length).toBeGreaterThanOrEqual(5);
  });

  it("渲染所有 5 个主题名", async () => {
    const wrapper = mount(ThemesPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    const text = wrapper.text();
    expect(text).toContain("简约通用");
    expect(text).toContain("生活杂志");
    expect(text).toContain("文艺人文");
    expect(text).toContain("商业财经");
    expect(text).toContain("科技数码");
  });
});

describe("AC-002: 当前已应用主题卡显示「正在使用」徽章", () => {
  it("editorStore.currentTheme=default 时 default 对应卡显示「正在使用」徽章", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useEditorStore } = await import("../../stores/editor.ts");
    const store = useEditorStore();
    store.currentTheme = "default";

    const wrapper = mount(ThemesPage, {
      global: { plugins: [pinia] },
    });
    await nextTick();

    const badge = wrapper.find('[data-testid="active-badge"]');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toContain("正在使用");
  });

  it("editorStore.currentTheme=magazine 时只有 magazine 对应卡有「正在使用」徽章（仅一个）", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useEditorStore } = await import("../../stores/editor.ts");
    const store = useEditorStore();
    store.currentTheme = "magazine";

    const wrapper = mount(ThemesPage, {
      global: { plugins: [pinia] },
    });
    await nextTick();

    const badges = wrapper.findAll('[data-testid="active-badge"]');
    expect(badges.length).toBe(1);
  });
});

describe("AC-003: 点击「使用此主题」切换 currentTheme", () => {
  it("点击 default 主题「使用此主题」按钮后 editorStore.currentTheme 更新为 default", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useEditorStore } = await import("../../stores/editor.ts");
    const store = useEditorStore();
    store.currentTheme = "tech";

    const wrapper = mount(ThemesPage, {
      global: { plugins: [pinia] },
    });
    await nextTick();

    const btn = wrapper.find('[data-testid="btn-use-theme-default"]');
    await btn.trigger("click");
    await nextTick();

    expect(store.currentTheme).toBe("default");
  });

  it("点击「使用此主题」后 pushToast 以 type=success 和含主题名的 message 调用", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useEditorStore } = await import("../../stores/editor.ts");
    const store = useEditorStore();
    store.currentTheme = "tech";

    const wrapper = mount(ThemesPage, {
      global: { plugins: [pinia] },
    });
    await nextTick();

    await wrapper.find('[data-testid="btn-use-theme-default"]').trigger("click");
    await nextTick();

    expect(pushToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success", message: expect.stringContaining("简约通用") })
    );
  });
});

describe("AC-004: 选择 template → 创建新文档并应用模板内容", () => {
  it("点击某卡「使用此模板」按钮后 createDoc 以该 template markdown 调用且 currentDocId 切换为新 id", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useEditorStore } = await import("../../stores/editor.ts");
    const store = useEditorStore();
    store.currentTheme = "default";
    const originalDocId = store.currentDocId;
    const createDocSpy = vi.spyOn(store, "createDoc").mockImplementation(async (initialContent) => {
      store.currentDocId = `draft-test-${Date.now()}`;
      store.content = initialContent;
      return store.currentDocId;
    });

    const wrapper = mount(ThemesPage, {
      global: { plugins: [pinia] },
    });
    await nextTick();

    await wrapper.find('[data-testid="btn-use-template-default-tpl-general"]').trigger("click");
    await nextTick();

    expect(createDocSpy).toHaveBeenCalledWith("# tpl-general template markdown");
    expect(store.currentDocId).not.toBe(originalDocId);
    expect(store.currentDocId).toMatch(/^draft-/);
  });
});

describe("AC-001: 筛选 — 按主题名关键词过滤卡片", () => {
  it("搜索输入框存在于页面（data-testid=filter-input）", async () => {
    const wrapper = mount(ThemesPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    expect(wrapper.find('[data-testid="filter-input"]').exists()).toBe(true);
  });

  it("输入 '简约' 后仅显示主题名含 '简约' 的卡片", async () => {
    const wrapper = mount(ThemesPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    const input = wrapper.find('[data-testid="filter-input"]');
    await input.setValue("简约");
    await nextTick();
    const cards = wrapper.findAll('[data-testid^="template-theme-card-"]');
    expect(cards.length).toBeGreaterThanOrEqual(1);
    for (const card of cards) {
      expect(card.text()).toContain("简约");
    }
  });

  it("输入无匹配词后显示空态提示（data-testid=empty-state）", async () => {
    const wrapper = mount(ThemesPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    const input = wrapper.find('[data-testid="filter-input"]');
    await input.setValue("xyzxyzxyz不可能存在的关键词");
    await nextTick();
    expect(wrapper.findAll('[data-testid^="template-theme-card-"]').length).toBe(0);
    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true);
  });

  it("清空输入后恢复显示全部卡片", async () => {
    const wrapper = mount(ThemesPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    const input = wrapper.find('[data-testid="filter-input"]');
    await input.setValue("简约");
    await nextTick();
    await input.setValue("");
    await nextTick();
    const cards = wrapper.findAll('[data-testid^="template-theme-card-"]');
    expect(cards.length).toBeGreaterThanOrEqual(5);
  });

  it("按 templateDescription 过滤：输入描述关键词也命中对应卡片", async () => {
    const wrapper = mount(ThemesPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    const input = wrapper.find('[data-testid="filter-input"]');
    await input.setValue("通用文章");
    await nextTick();
    const cards = wrapper.findAll('[data-testid^="template-theme-card-"]');
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });
});
