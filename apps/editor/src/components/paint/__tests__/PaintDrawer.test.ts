import "fake-indexeddb/auto";
import { mount } from "@vue/test-utils";
import { parseFrontmatter, registerTheme, resetThemeRegistry } from "@wechat-flow/core";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { usePaintBinding } from "../../../composables/use-paint-binding.ts";
import { useEditorStore } from "../../../stores/editor.ts";
import PaintDrawer from "../PaintDrawer.vue";

vi.mock("../../../use-cases/render.ts", () => ({
  composeRender: vi.fn().mockResolvedValue({
    html: "<p>preview</p>",
    nodeLocations: [],
    report: {
      diagnostics: [],
      nodeChangeRecords: [],
      nightRiskIssues: [],
      versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
    },
  }),
}));

vi.mock("@wechat-flow/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@wechat-flow/core")>();
  return {
    ...actual,
    saveDraft: vi.fn().mockResolvedValue(undefined),
    loadDocument: vi.fn().mockResolvedValue(null),
  };
});

const PAINT_TEST_THEME_ID = "paint-test";

function setupPaintTheme(): void {
  resetThemeRegistry();
  registerTheme({
    id: PAINT_TEST_THEME_ID,
    name: "T",
    tokens: {
      "--color-accent": "#aabbcc",
      "--color-brand": "#001122",
    },
    blocks: {
      p: { default: { color: "#aabbcc", "font-size": "15px" } },
    },
    paintable: ["--color-accent", "--color-brand"],
    assets: {},
    meta: { author: "test", version: "1.0.0", wcagContrast: { checked: true, minRatio: 4.5 } },
  });
}

beforeEach(() => {
  setActivePinia(createPinia());
  setupPaintTheme();
});

afterEach(() => {
  resetThemeRegistry();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// AC-001: PaintDrawer 列出 paintableTokens
// ---------------------------------------------------------------------------

describe("AC-001: PaintDrawer 列出当前主题 paintable tokens", () => {
  it("mount PaintDrawer（store currentTheme=paint-test），picker 数量等于 paintable 长度 2", async () => {
    const store = useEditorStore();
    store.currentTheme = PAINT_TEST_THEME_ID;

    const wrapper = mount(PaintDrawer, { props: { isOpen: true } });
    await nextTick();

    const items = wrapper.findAll('[data-testid^="paint-token-"]');
    expect(items).toHaveLength(2);
    wrapper.unmount();
  });

  it("paintableTokens 为空时显示占位提示", async () => {
    resetThemeRegistry();
    registerTheme({
      id: "no-paint",
      name: "No Paint",
      tokens: {},
      blocks: {},
      paintable: [],
      assets: {},
      meta: { author: "t", version: "1.0.0", wcagContrast: { checked: true, minRatio: 4.5 } },
    });
    const store = useEditorStore();
    store.currentTheme = "no-paint";

    const wrapper = mount(PaintDrawer, { props: { isOpen: true } });
    await nextTick();

    expect(wrapper.find('[data-testid="paint-drawer-empty"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("isOpen=false 时 drawer 不渲染", async () => {
    const wrapper = mount(PaintDrawer, { props: { isOpen: false } });
    await nextTick();

    expect(wrapper.find('[data-testid="paint-drawer"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("drawer 含「自定义配色」标题", async () => {
    const store = useEditorStore();
    store.currentTheme = PAINT_TEST_THEME_ID;

    const wrapper = mount(PaintDrawer, { props: { isOpen: true } });
    await nextTick();

    expect(wrapper.find('[data-testid="paint-drawer-header"]').text()).toContain("自定义配色");
    wrapper.unmount();
  });

  it("点击关闭按钮 emit close", async () => {
    const store = useEditorStore();
    store.currentTheme = PAINT_TEST_THEME_ID;

    const wrapper = mount(PaintDrawer, { props: { isOpen: true } });
    await nextTick();

    await wrapper.find('[data-testid="paint-drawer-close"]').trigger("click");
    await nextTick();

    expect(wrapper.emitted("close")).toBeDefined();
    wrapper.unmount();
  });
});

// ---------------------------------------------------------------------------
// AC-002: picker input → store.content 更新（UI → 源码）
// ---------------------------------------------------------------------------

describe("AC-002: color picker 触发 input → store.content 含 paint 字段（UI→源码）", () => {
  it("触发 picker @input → store.content 经 parseFrontmatter 读出 meta.paint 含对应 token 与颜色", async () => {
    const store = useEditorStore();
    store.currentTheme = PAINT_TEST_THEME_ID;
    store.content = "# Hello\n";

    const wrapper = mount(PaintDrawer, { props: { isOpen: true } });
    await nextTick();

    const row = wrapper.find('[data-testid="paint-token---color-accent"]');
    expect(row.exists()).toBe(true);

    const input = row.find('input[type="color"]');
    expect(input.exists()).toBe(true);

    const el = input.element as HTMLInputElement;
    el.value = "#ff0000";
    await input.trigger("input");
    await nextTick();

    const { meta } = parseFrontmatter(store.content);
    expect(meta.paint?.["--color-accent"]).toBe("#ff0000");
    wrapper.unmount();
  });

  it("触发 picker input 后 store.content 字符串含 'paint:'", async () => {
    const store = useEditorStore();
    store.currentTheme = PAINT_TEST_THEME_ID;
    store.content = "# Hello\n";

    const wrapper = mount(PaintDrawer, { props: { isOpen: true } });
    await nextTick();

    const row = wrapper.find('[data-testid="paint-token---color-brand"]');
    const input = row.find('input[type="color"]');
    (input.element as HTMLInputElement).value = "#445566";
    await input.trigger("input");
    await nextTick();

    expect(store.content).toContain("paint:");
    wrapper.unmount();
  });
});

// ---------------------------------------------------------------------------
// AC-003: store.content 更改 → picker value 同步（源码 → UI）
// ---------------------------------------------------------------------------

describe("AC-003: store.content 含 paint → picker value 双向同步（源码→UI）", () => {
  it("直接设置 store.content 含 paint → PaintDrawer 中对应 picker value 同步", async () => {
    const store = useEditorStore();
    store.currentTheme = PAINT_TEST_THEME_ID;

    const wrapper = mount(PaintDrawer, { props: { isOpen: true } });
    await nextTick();

    store.content = "---\npaint:\n  '--color-accent': '#123456'\n---\n# Hello\n";
    await nextTick();

    const row = wrapper.find('[data-testid="paint-token---color-accent"]');
    const input = row.find('input[type="color"]');
    expect((input.element as HTMLInputElement).value).toBe("#123456");
    wrapper.unmount();
  });

  it("content 中无 paint 时 picker value 使用默认 #000000", async () => {
    const store = useEditorStore();
    store.currentTheme = PAINT_TEST_THEME_ID;
    store.content = "# Hello\n";

    const wrapper = mount(PaintDrawer, { props: { isOpen: true } });
    await nextTick();

    const row = wrapper.find('[data-testid="paint-token---color-brand"]');
    const input = row.find('input[type="color"]');
    expect((input.element as HTMLInputElement).value).toBe("#000000");
    wrapper.unmount();
  });
});

// ---------------------------------------------------------------------------
// AC-004: 超出 paintable 白名单的 token 产生 warn diagnostic
// ---------------------------------------------------------------------------

describe("AC-004: renderMarkdown 含超出 paintable 白名单的 paint token → warn diagnostic", () => {
  it("paint 含非 paintable token → renderMarkdown diagnostics 含 paint-token-not-paintable warning", async () => {
    const { renderMarkdown } = await import("@wechat-flow/core");
    const md =
      "---\ntheme: paint-test\npaint:\n  '--color-not-paintable': '#ffffff'\n---\n# Hello\n";
    const result = await renderMarkdown(md);
    const warn = result.diagnostics.find(
      (d) => d.severity === "warning" && d.ruleId === "paint-token-not-paintable"
    );
    expect(warn).toBeDefined();
    expect(warn?.message).toContain("--color-not-paintable");
  });

  it("paint 含 paintable token → 无 paint-token-not-paintable warning", async () => {
    const { renderMarkdown } = await import("@wechat-flow/core");
    const md = "---\ntheme: paint-test\npaint:\n  '--color-accent': '#ff0000'\n---\n# Hello\n";
    const result = await renderMarkdown(md);
    const warn = result.diagnostics.find((d) => d.ruleId === "paint-token-not-paintable");
    expect(warn).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Composable unit: usePaintBinding
// ---------------------------------------------------------------------------

describe("usePaintBinding composable", () => {
  it("paintableTokens 返回当前主题的 paintable array", () => {
    const store = useEditorStore();
    store.currentTheme = PAINT_TEST_THEME_ID;

    const { paintableTokens } = usePaintBinding();
    expect(paintableTokens.value).toEqual(["--color-accent", "--color-brand"]);
  });

  it("currentPaint 从 store.content frontmatter 解析 paint", () => {
    const store = useEditorStore();
    store.currentTheme = PAINT_TEST_THEME_ID;
    store.content = "---\npaint:\n  '--color-accent': '#aabbcc'\n---\n# Hello\n";

    const { currentPaint } = usePaintBinding();
    expect(currentPaint.value).toEqual({ "--color-accent": "#aabbcc" });
  });

  it("currentPaint 无 frontmatter 时返回 {}", () => {
    const store = useEditorStore();
    store.currentTheme = PAINT_TEST_THEME_ID;
    store.content = "# Hello\n";

    const { currentPaint } = usePaintBinding();
    expect(currentPaint.value).toEqual({});
  });

  it("setPaint 调用后 store.content 经 parseFrontmatter 含指定 token 颜色", () => {
    const store = useEditorStore();
    store.currentTheme = PAINT_TEST_THEME_ID;
    store.content = "# Hello\n";

    const { setPaint } = usePaintBinding();
    setPaint("--color-accent", "#ff0000");

    const { meta } = parseFrontmatter(store.content);
    expect(meta.paint?.["--color-accent"]).toBe("#ff0000");
  });

  it("clearPaint 调用后 store.content 中对应 token 被移除", () => {
    const store = useEditorStore();
    store.currentTheme = PAINT_TEST_THEME_ID;
    store.content =
      "---\npaint:\n  '--color-accent': '#ff0000'\n  '--color-brand': '#001122'\n---\n# Hello\n";

    const { clearPaint } = usePaintBinding();
    clearPaint("--color-accent");

    const { meta } = parseFrontmatter(store.content);
    expect(meta.paint?.["--color-accent"]).toBeUndefined();
    expect(meta.paint?.["--color-brand"]).toBe("#001122");
  });

  it("paintableTokens 主题不存在时返回 []", () => {
    const store = useEditorStore();
    store.currentTheme = "nonexistent-theme";

    const { paintableTokens } = usePaintBinding();
    expect(paintableTokens.value).toEqual([]);
  });
});
