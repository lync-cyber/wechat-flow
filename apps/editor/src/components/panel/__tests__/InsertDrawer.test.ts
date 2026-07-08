import { mount } from "@vue/test-utils";
import {
  describeBlock,
  listBlocks,
  registerBlock,
  renderMarkdown,
  resetBlockRegistry,
} from "@wechat-flow/core";
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
    category: "emphasis",
    directiveAttrs: z.object({
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
    category: "text",
    directiveAttrs: z.object({
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

const CATEGORY_ORDER = ["text", "media", "emphasis", "structured", "marketing", "meta"] as const;
const CATEGORY_LABELS: Record<(typeof CATEGORY_ORDER)[number], string> = {
  text: "基础排版",
  media: "图文媒体",
  emphasis: "强调提示",
  structured: "结构化",
  marketing: "运营引流",
  meta: "元信息",
};

const BLOCK_NAMES: Record<string, string> = {
  heading: "标题",
  paragraph: "段落",
  list: "列表",
  table: "表格",
  "code-block": "代码块",
  quote: "引用",
  divider: "分隔线",
  "definition-list": "定义列表",
  image: "图片",
  "image-caption": "图注",
  gallery: "图集",
  video: "视频",
  audio: "音频",
  qrcode: "二维码",
  callout: "提示框",
  warning: "警示",
  "highlight-block": "高亮块",
  "pull-quote": "摘引",
  "tip-grid": "小技巧网格",
  announcement: "公告",
  disclaimer: "免责声明",
  card: "卡片",
  steps: "步骤",
  compare: "对比",
  timeline: "时间线",
  dialog: "对话",
  qa: "问答",
  "kpi-card": "KPI 数据卡",
  "footer-cta": "页脚 CTA",
  "social-cta": "社交引导 CTA",
  "subscribe-cta": "订阅 CTA",
  "advert-card": "广告卡",
  "miniprogram-card": "小程序卡",
  recommendation: "推荐",
  "related-cards": "相关卡片",
  "author-card": "作者卡",
  "publication-skeleton": "刊物骨架",
  "reading-time": "阅读时长",
  footnote: "脚注",
  citation: "引用出处",
};

function registerFullTaxonomy(): void {
  const perCategory: Array<{ category: (typeof CATEGORY_ORDER)[number]; ids: string[] }> = [
    {
      category: "text",
      ids: [
        "heading",
        "paragraph",
        "list",
        "table",
        "code-block",
        "quote",
        "divider",
        "definition-list",
      ],
    },
    { category: "media", ids: ["image", "image-caption", "gallery", "video", "audio", "qrcode"] },
    {
      category: "emphasis",
      ids: [
        "callout",
        "warning",
        "highlight-block",
        "pull-quote",
        "tip-grid",
        "announcement",
        "disclaimer",
      ],
    },
    {
      category: "structured",
      ids: ["card", "steps", "compare", "timeline", "dialog", "qa", "kpi-card"],
    },
    {
      category: "marketing",
      ids: [
        "footer-cta",
        "social-cta",
        "subscribe-cta",
        "advert-card",
        "miniprogram-card",
        "recommendation",
        "related-cards",
      ],
    },
    {
      category: "meta",
      ids: ["author-card", "publication-skeleton", "reading-time", "footnote", "citation"],
    },
  ];
  for (const { category, ids } of perCategory) {
    for (const id of ids) {
      registerBlock({
        id,
        name: BLOCK_NAMES[id] ?? id,
        category,
        directiveAttrs: z.object({ text: z.string().optional() }),
        variants: [],
        slots: ["root"],
      });
    }
  }
}

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

  it("渲染当前分类 Tab 下注册中心的 Block，每条对应一个 data-testid=block-lib-item", async () => {
    const wrapper = mount(InsertDrawer, { props: defaultProps() });
    await nextTick();

    const blocks = listBlocks().filter((b) => b.category === "text");
    const items = wrapper.findAll('[data-testid="block-lib-item"]');
    expect(items.length).toBe(blocks.length);
    wrapper.unmount();
  });

  it("UC-015 Block 行首图标数据驱动（callout → block-glyph，非硬编码占位）", async () => {
    const wrapper = mount(InsertDrawer, { props: defaultProps() });
    await nextTick();

    await wrapper.find('[data-testid="category-tab-emphasis"]').trigger("click");
    await nextTick();

    const calloutItem = wrapper
      .findAll('[data-testid="block-lib-item"]')
      .find((i) => i.text().includes("提示框"));
    expect(calloutItem).toBeTruthy();
    const icon = calloutItem?.find(".block-lib-item__icon");
    expect(icon?.exists()).toBe(true);
    expect(icon?.text()).toBe("▢");
    expect(icon?.text()).not.toBe("⬜");
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

    await wrapper.find('[data-testid="category-tab-emphasis"]').trigger("click");
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

describe("T-137 AC-001: 6 分类 Tab 按 BlockCategory 枚举声明顺序渲染，默认选中 text", () => {
  beforeEach(() => {
    registerFullTaxonomy();
  });

  it("渲染 6 个分类 Tab，顺序为 text/media/emphasis/structured/marketing/meta", async () => {
    const wrapper = mount(InsertDrawer, { props: defaultProps() });
    await nextTick();

    const tabs = wrapper.findAll('[data-testid^="category-tab-"]');
    expect(tabs.length).toBe(6);
    const order = tabs.map((t) => t.attributes("data-testid")?.replace("category-tab-", ""));
    expect(order).toEqual([...CATEGORY_ORDER]);
    wrapper.unmount();
  });

  it("默认选中第一个 Tab（text）", async () => {
    const wrapper = mount(InsertDrawer, { props: defaultProps() });
    await nextTick();

    const textTab = wrapper.find('[data-testid="category-tab-text"]');
    expect(textTab.exists()).toBe(true);
    expect(textTab.classes()).toContain("insert-drawer__tab--active");
    wrapper.unmount();
  });
});

describe("T-137 AC-002: 分类 Tab 标签为硬编码中文映射，Tab 集合随实际 category 取值集合派生", () => {
  beforeEach(() => {
    registerFullTaxonomy();
  });

  it("6 个分类 Tab 文案分别为基础排版/图文媒体/强调提示/结构化/运营引流/元信息", async () => {
    const wrapper = mount(InsertDrawer, { props: defaultProps() });
    await nextTick();

    for (const category of CATEGORY_ORDER) {
      const tab = wrapper.find(`[data-testid="category-tab-${category}"]`);
      expect(tab.exists()).toBe(true);
      expect(tab.text()).toContain(CATEGORY_LABELS[category]);
    }
    wrapper.unmount();
  });

  it("仅注册部分 category 的 Block 时，Tab 集合随之收缩，不渲染无 Block 的分类", async () => {
    resetBlockRegistry();
    registerBlock({
      id: "heading",
      name: "标题",
      category: "text",
      directiveAttrs: z.object({ text: z.string() }),
      variants: [],
      slots: ["root"],
    });
    registerBlock({
      id: "callout",
      name: "提示框",
      category: "emphasis",
      directiveAttrs: z.object({ text: z.string() }),
      variants: [],
      slots: ["root"],
    });

    const wrapper = mount(InsertDrawer, { props: defaultProps() });
    await nextTick();

    const tabs = wrapper.findAll('[data-testid^="category-tab-"]');
    const rendered = tabs.map((t) => t.attributes("data-testid")?.replace("category-tab-", ""));
    expect(rendered).toEqual(["text", "emphasis"]);
    expect(wrapper.find('[data-testid="category-tab-media"]').exists()).toBe(false);
    wrapper.unmount();
  });
});

describe("T-137 AC-003: 点击分类 Tab 后组件列表仅显示该分类 Block", () => {
  beforeEach(() => {
    registerFullTaxonomy();
  });

  it("点击 media Tab 后仅显示 category=media 的 6 个 Block", async () => {
    const wrapper = mount(InsertDrawer, { props: defaultProps() });
    await nextTick();

    await wrapper.find('[data-testid="category-tab-media"]').trigger("click");
    await nextTick();

    const items = wrapper.findAll('[data-testid="block-lib-item"]');
    expect(items.length).toBe(6);
    const names = items.map((i) => i.text());
    expect(names.some((n) => n.includes("图片"))).toBe(true);
    expect(names.some((n) => n.includes("标题"))).toBe(false);
    wrapper.unmount();
  });
});

describe("T-137 AC-004: 搜索框在当前 Tab 结果集内模糊过滤，不切换 Tab", () => {
  beforeEach(() => {
    registerFullTaxonomy();
  });

  it("输入关键字后列表按名称/id 模糊过滤，且不切换当前选中 Tab", async () => {
    const wrapper = mount(InsertDrawer, { props: defaultProps() });
    await nextTick();

    await wrapper.find('[data-testid="category-tab-media"]').trigger("click");
    await nextTick();

    const search = wrapper.find('[data-testid="insert-drawer-search"]');
    expect(search.exists()).toBe(true);
    await search.setValue("图片");
    await nextTick();

    const items = wrapper.findAll('[data-testid="block-lib-item"]');
    expect(items.length).toBe(1);
    expect(items[0]?.text()).toContain("图片");

    const mediaTab = wrapper.find('[data-testid="category-tab-media"]');
    expect(mediaTab.classes()).toContain("insert-drawer__tab--active");
    wrapper.unmount();
  });

  it("清空搜索框后恢复该 Tab 全量列表", async () => {
    const wrapper = mount(InsertDrawer, { props: defaultProps() });
    await nextTick();

    await wrapper.find('[data-testid="category-tab-media"]').trigger("click");
    await nextTick();

    const search = wrapper.find('[data-testid="insert-drawer-search"]');
    await search.setValue("图片");
    await nextTick();
    expect(wrapper.findAll('[data-testid="block-lib-item"]').length).toBe(1);

    await search.setValue("");
    await nextTick();

    expect(wrapper.findAll('[data-testid="block-lib-item"]').length).toBe(6);
    wrapper.unmount();
  });
});

describe("T-137 AC-005: 无「全部」Tab，6 分类完整覆盖 40 个 Block", () => {
  beforeEach(() => {
    registerFullTaxonomy();
  });

  it("DOM 中不存在「全部」文案的 Tab 元素", async () => {
    const wrapper = mount(InsertDrawer, { props: defaultProps() });
    await nextTick();

    const tabs = wrapper.findAll('[data-testid^="category-tab-"]');
    expect(tabs.length).toBe(6);
    const hasAllTab = tabs.some((t) => t.text().includes("全部"));
    expect(hasAllTab).toBe(false);
    expect(wrapper.find('[data-testid="category-tab-all"]').exists()).toBe(false);
    wrapper.unmount();
  });
});

describe("T-137 AC-006: 分类 Tab 行高 40px、搜索框高 36px", () => {
  beforeEach(() => {
    registerFullTaxonomy();
  });

  it("分类 Tab 行渲染后计算/inline height 为 40px", async () => {
    // getBoundingClientRect 在 happy-dom 无真实布局计算恒为 0，断言渲染后 computed style
    // 的 height 声明值；完整视觉核验由 design-overlay（Playwright）轨道承接。
    const wrapper = mount(InsertDrawer, { props: defaultProps() });
    await nextTick();

    const tabRow = wrapper.find('[data-testid="insert-drawer-tab-row"]');
    expect(tabRow.exists()).toBe(true);
    const el = tabRow.element as HTMLElement;
    const height = el.style.height || getComputedStyle(el).height;
    expect(height).toBe("40px");
    wrapper.unmount();
  });

  it("搜索框渲染后计算/inline height 为 36px", async () => {
    const wrapper = mount(InsertDrawer, { props: defaultProps() });
    await nextTick();

    const search = wrapper.find('[data-testid="insert-drawer-search"]');
    expect(search.exists()).toBe(true);
    const el = search.element as HTMLElement;
    const height = el.style.height || getComputedStyle(el).height;
    expect(height).toBe("36px");
    wrapper.unmount();
  });
});

async function selectRealBlock(blockId: string) {
  const wrapper = mount(InsertDrawer, { props: defaultProps() });
  await nextTick();
  const block = describeBlock(blockId);
  if (!block) throw new Error(`block not registered: ${blockId}`);

  await wrapper.find(`[data-testid="category-tab-${block.category}"]`).trigger("click");
  await nextTick();

  const item = wrapper
    .findAll('[data-testid="block-lib-item"]')
    .find((i) => i.text().includes(block.name));
  if (!item) throw new Error(`block-lib-item not found for: ${blockId}`);
  await item.trigger("click");
  await nextTick();

  return wrapper;
}

function renderedParamFieldKeys(wrapper: Awaited<ReturnType<typeof selectRealBlock>>): string[] {
  return wrapper
    .findAll('[data-testid^="param-input-"]')
    .map((el) => el.attributes("data-testid")?.replace("param-input-", "") ?? "");
}

describe("T-165 AC-001: 参数区字段从 directiveAttrs.shape 生成（真实内置 Block）", () => {
  beforeEach(async () => {
    resetBlockRegistry();
    await import("@wechat-flow/blocks");
  });

  it("选中 pull-quote 时参数区仅显示 author 字段", async () => {
    const wrapper = await selectRealBlock("pull-quote");
    expect(renderedParamFieldKeys(wrapper)).toEqual(["author"]);
    wrapper.unmount();
  });

  it("选中 dialog 时参数区显示 speaker/avatar 字段", async () => {
    const wrapper = await selectRealBlock("dialog");
    expect(renderedParamFieldKeys(wrapper)).toEqual(["speaker", "avatar"]);
    wrapper.unmount();
  });

  it("选中 compare 时参数区显示 left-label/left-value/right-label/right-value/title 字段", async () => {
    const wrapper = await selectRealBlock("compare");
    expect(renderedParamFieldKeys(wrapper)).toEqual([
      "left-label",
      "left-value",
      "right-label",
      "right-value",
      "title",
    ]);
    wrapper.unmount();
  });

  it("选中 callout 时参数区无字段（结构化域字段 text/title 不再出现）", async () => {
    const wrapper = await selectRealBlock("callout");
    expect(renderedParamFieldKeys(wrapper)).toEqual([]);
    expect(wrapper.find('[data-testid="param-input-text"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="param-input-title"]').exists()).toBe(false);
    wrapper.unmount();
  });
});

describe("T-165 AC-002: 参数区填写 author 后插入并经真实渲染管线渲染，属性真实生效", () => {
  beforeEach(async () => {
    resetBlockRegistry();
    await import("@wechat-flow/blocks");
  });

  it("选中 pull-quote 的 decorated 变体，填写 author=鲁迅 插入并渲染，产物含署名行「鲁迅」", async () => {
    const onInsert = vi.fn();
    const wrapper = await selectRealBlock("pull-quote");
    await wrapper.setProps({ onInsert });

    await wrapper.find('[data-testid="insert-drawer-variant-decorated"]').trigger("click");
    await nextTick();

    await wrapper.find('[data-testid="param-input-author"]').setValue("鲁迅");
    await nextTick();

    await wrapper.find('[data-testid="insert-drawer-submit"]').trigger("click");
    await nextTick();

    expect(onInsert).toHaveBeenCalledOnce();
    const [directive] = onInsert.mock.calls[0] as [string];
    expect(directive).toContain(".decorated");
    expect(directive).toContain('author="鲁迅"');

    const result = await renderMarkdown(directive, { themeId: "default" });
    expect(result.html).toContain("鲁迅");
    wrapper.unmount();
  });

  it("未选择变体（保持默认）时插入生成的指令文本不含变体 class", async () => {
    const onInsert = vi.fn();
    const wrapper = await selectRealBlock("pull-quote");
    await wrapper.setProps({ onInsert });

    await wrapper.find('[data-testid="param-input-author"]').setValue("鲁迅");
    await nextTick();
    await wrapper.find('[data-testid="insert-drawer-submit"]').trigger("click");
    await nextTick();

    const [directive] = onInsert.mock.calls[0] as [string];
    expect(directive).not.toContain(".decorated");
    expect(directive).toContain('author="鲁迅"');
    wrapper.unmount();
  });
});

describe("T-165 AC-003: shape 字段提取收敛为共用 util，跨组件结果一致", () => {
  beforeEach(async () => {
    resetBlockRegistry();
    await import("@wechat-flow/blocks");
  });

  it("dialog 的参数字段集合（speaker/avatar）与 describeBlock 返回的 directiveAttrs.shape 键集合一致", async () => {
    const wrapper = await selectRealBlock("dialog");
    const block = describeBlock("dialog");
    if (!block) throw new Error("dialog not registered");
    const shapeKeys = Object.keys(
      (block.directiveAttrs as unknown as { shape: Record<string, unknown> }).shape
    );
    expect(renderedParamFieldKeys(wrapper)).toEqual(shapeKeys);
    wrapper.unmount();
  });
});
