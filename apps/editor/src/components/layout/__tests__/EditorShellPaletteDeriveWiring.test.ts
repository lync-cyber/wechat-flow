import "fake-indexeddb/auto";
import { mount } from "@vue/test-utils";
import { closeDb, registerTheme, resetThemeRegistry } from "@wechat-flow/core";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { useToast } from "../../../composables/use-toast.ts";
import { useEditorStore } from "../../../stores/editor.ts";
import EditorShell from "../EditorShell.vue";

vi.mock("../../../use-cases/render.ts", () => ({
  composeRender: vi.fn().mockResolvedValue({
    html: "<p>preview</p>",
    diagnostics: [],
    versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
    report: {
      diagnostics: [],
      nodeChangeRecords: [],
      nightRiskIssues: [],
      versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
    },
  }),
}));

const DERIVE_TEST_THEME_ID = "palette-derive-test";

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

beforeEach(() => {
  setViewportWidth(1440);
  setActivePinia(createPinia());
  resetThemeRegistry();
  registerTheme({
    id: DERIVE_TEST_THEME_ID,
    name: "派生测试",
    tokens: { "--color-brand": "#001122", "--color-accent": "#334455" },
    blocks: {},
    paintable: ["--color-brand", "--color-accent"],
    assets: {},
    meta: { author: "test", version: "1.0.0", wcagContrast: { checked: true, minRatio: 4.5 } },
  });
});

afterEach(async () => {
  await closeDb();
  indexedDB.deleteDatabase("wechat-flow-db");
  for (const el of document.body.querySelectorAll('[data-testid="hamburger-btn"]')) {
    el.remove();
  }
  setViewportWidth(1440);
  resetThemeRegistry();
  vi.clearAllMocks();
  useToast().toasts.value = [];
});

describe("UC-020: LeftPanelTabs「调色板派生」链接接线", () => {
  it("点击「调色板派生」链接打开 BaseColorDeriveModal", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="base-color-derive-modal"]').exists()).toBe(false);

    await wrapper.find('[data-testid="link-palette-derive"]').trigger("click");
    await nextTick();

    expect(wrapper.find('[data-testid="base-color-derive-modal"]').exists()).toBe(true);
    wrapper.unmount();
  });
});

describe("UC-020: 命令面板「调色板派生」命令接线", () => {
  it("命令面板执行 theme-palette-derive 打开 BaseColorDeriveModal", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const commandPalette = wrapper.findComponent({ name: "CommandPalette" });
    const commands = commandPalette.props("commands") as { id: string; run: () => void }[];
    const cmd = commands.find((c) => c.id === "theme-palette-derive");
    expect(cmd).toBeDefined();

    cmd?.run();
    await nextTick();

    expect(wrapper.find('[data-testid="base-color-derive-modal"]').exists()).toBe(true);
    wrapper.unmount();
  });
});

describe("UC-020: onApply → paintableTokens 交集 setPaint 生效", () => {
  it("onApply 收到的 derivedTokens 中仅 paintable 白名单内的 token 被写入 store.content paint", async () => {
    const store = useEditorStore();
    store.currentTheme = DERIVE_TEST_THEME_ID;
    store.content = "# Hello\n";

    const wrapper = mount(EditorShell, {
      attachTo: document.body,
    });
    await nextTick();

    const modal = wrapper.findComponent({ name: "BaseColorDeriveModal" });
    const onApply = modal.props("onApply") as (
      baseColor: string,
      tokens: Record<string, string>
    ) => void;

    onApply("#2d5a4e", {
      "--color-brand": "#2d5a4e",
      "--color-accent": "#aa1122",
      "--color-surface": "#ffffff",
    });
    await nextTick();

    const { parseFrontmatter } = await import("@wechat-flow/core");
    const { meta } = parseFrontmatter(store.content);
    expect(meta.paint?.["--color-brand"]).toBe("#2d5a4e");
    expect(meta.paint?.["--color-accent"]).toBe("#aa1122");
    expect(meta.paint?.["--color-surface"]).toBeUndefined();

    wrapper.unmount();
  });

  it("onApply 后 modal 关闭并推送 success toast", async () => {
    const store = useEditorStore();
    store.currentTheme = DERIVE_TEST_THEME_ID;

    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    await wrapper.find('[data-testid="link-palette-derive"]').trigger("click");
    await nextTick();
    expect(wrapper.find('[data-testid="base-color-derive-modal"]').exists()).toBe(true);

    const modal = wrapper.findComponent({ name: "BaseColorDeriveModal" });
    const onApply = modal.props("onApply") as (
      baseColor: string,
      tokens: Record<string, string>
    ) => void;
    onApply("#2d5a4e", { "--color-brand": "#2d5a4e" });
    await nextTick();

    expect(wrapper.find('[data-testid="base-color-derive-modal"]').exists()).toBe(false);
    const { toasts } = useToast();
    expect(toasts.value.some((t) => t.type === "success")).toBe(true);

    wrapper.unmount();
  });
});
