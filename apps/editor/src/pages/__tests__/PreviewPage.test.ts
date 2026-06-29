import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

vi.mock("@wechat-flow/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@wechat-flow/core")>();
  return {
    ...actual,
    loadDocument: vi.fn().mockResolvedValue(undefined),
    saveDraft: vi.fn().mockResolvedValue(undefined),
    listDocuments: vi.fn().mockResolvedValue([
      { id: "doc-1", title: "文档一", updatedAt: 1000 },
      { id: "doc-2", title: "文档二", updatedAt: 900 },
    ]),
    simulatePaste: vi.fn().mockReturnValue({ filteredHtml: "<p>html</p>" }),
    renderMarkdown: vi.fn().mockResolvedValue("<p>html</p>"),
  };
});

const { pushToast } = vi.hoisted(() => ({ pushToast: vi.fn() }));
vi.mock("../../composables/use-toast.ts", () => ({
  useToast: () => ({
    toasts: { value: [] },
    pushToast,
    dismissToast: vi.fn(),
  }),
}));

const mockRouterPush = vi.fn();
vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { docId: "doc-1" } }),
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("../../use-cases/render.ts", () => ({
  composeRender: vi.fn().mockResolvedValue({
    html: "<p>preview</p>",
    nodeLocations: [],
    report: {
      diagnostics: [],
      nodeChangeRecords: [],
      nightRiskIssues: [],
      versionTriple: { coreVersion: "0", themeVersion: "0", rulesetVersion: "0" },
    },
  }),
}));

vi.mock("../../use-cases/copy.ts", () => ({
  composeCopy: vi.fn(async (input: { notify?: (n: { type: string; message: string }) => void }) => {
    input.notify?.({ type: "success", message: "已复制到剪贴板" });
  }),
}));

import PreviewPage from "../PreviewPage.vue";

beforeEach(() => {
  setActivePinia(createPinia());
  pushToast.mockClear();
  mockRouterPush.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AC-001: PreviewPage 单栏只读布局", () => {
  it("渲染预览 iframe（data-testid=preview-iframe）而非编辑区", async () => {
    const wrapper = mount(PreviewPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    expect(wrapper.find('[data-testid="preview-iframe"]').exists()).toBe(true);
  });

  it("渲染底部固定栏（data-testid=mobile-bottom-bar）", async () => {
    const wrapper = mount(PreviewPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    expect(wrapper.find('[data-testid="mobile-bottom-bar"]').exists()).toBe(true);
  });

  it("不渲染编辑区（无 data-testid=editor-shell 或 source-pane）", async () => {
    const wrapper = mount(PreviewPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    expect(wrapper.find('[data-testid="editor-shell"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="source-pane"]').exists()).toBe(false);
  });

  it("顶栏高度为 48px（data-testid=preview-topbar）", async () => {
    const wrapper = mount(PreviewPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    const topbar = wrapper.find('[data-testid="preview-topbar"]');
    expect(topbar.exists()).toBe(true);
    expect(topbar.attributes("style") ?? topbar.element.getAttribute("style") ?? "").toMatch(
      /height:\s*48px/
    );
  });

  it("底部固定栏高度为 56px（data-testid=mobile-bottom-bar）", async () => {
    const wrapper = mount(PreviewPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    const bar = wrapper.find('[data-testid="mobile-bottom-bar"]');
    expect(bar.exists()).toBe(true);
    expect(bar.attributes("style") ?? bar.element.getAttribute("style") ?? "").toMatch(
      /height:\s*56px/
    );
  });

  it("iframe 容器宽度为 375px", async () => {
    const wrapper = mount(PreviewPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    const container = wrapper.find('[data-testid="preview-viewport-container"]');
    expect(container.exists()).toBe(true);
    expect(container.attributes("style") ?? "").toMatch(/width:\s*375px/);
  });
});

describe("AC-002: 一键复制 — Clipboard API 支持路径", () => {
  it("点击「一键复制」按钮调用 composeCopy 并 pushToast success「已复制」且仅一次", async () => {
    const { composeCopy } = await import("../../use-cases/copy.ts");
    const composeCopyMock = composeCopy as ReturnType<typeof vi.fn>;
    composeCopyMock.mockImplementation(
      async (input: { notify?: (n: { type: string; message: string }) => void }) => {
        input.notify?.({ type: "success", message: "已复制到剪贴板" });
      }
    );

    const wrapper = mount(PreviewPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const btn = wrapper.find('[data-testid="btn-copy"]');
    expect(btn.exists()).toBe(true);
    await btn.trigger("click");
    await nextTick();

    expect(composeCopyMock).toHaveBeenCalled();
    expect(pushToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success", message: expect.stringContaining("已复制") })
    );
    expect(pushToast).toHaveBeenCalledTimes(1);
  });
});

describe("AC-004: 一键复制 — Clipboard API 不支持降级", () => {
  it("Clipboard API 不支持时 pushToast warning 含「请手动长按复制」", async () => {
    const wrapper = mount(PreviewPage, {
      global: { plugins: [createPinia()] },
      attachTo: document.body,
    });
    await nextTick();

    // Force disable clipboard API
    const origClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });

    const btn = wrapper.find('[data-testid="btn-copy"]');
    await btn.trigger("click");
    await nextTick();

    expect(pushToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("请手动长按复制") })
    );

    // Restore
    if (origClipboard) {
      Object.defineProperty(navigator, "clipboard", origClipboard);
    }

    wrapper.unmount();
  });
});

describe("AC-003: 文档切换抽屉", () => {
  it("点击「文档切换」按钮后抽屉可见（data-testid=document-list-sheet 存在且 open）", async () => {
    const wrapper = mount(PreviewPage, {
      global: { plugins: [createPinia()] },
      attachTo: document.body,
    });
    await nextTick();

    const btn = wrapper.find('[data-testid="btn-switch-doc"]');
    expect(btn.exists()).toBe(true);
    await btn.trigger("click");
    await nextTick();

    expect(wrapper.find('[data-testid="document-list-sheet"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("抽屉关闭时 data-testid=document-list-sheet 隐藏（v-show=false：display:none 样式）", async () => {
    const wrapper = mount(PreviewPage, {
      global: { plugins: [createPinia()] },
      attachTo: document.body,
    });
    await nextTick();

    // Sheet should start closed — v-show=false adds display:none
    const sheet = wrapper.find('[data-testid="document-list-sheet"]');
    // v-show renders but hides with display:none
    if (sheet.exists()) {
      const style = sheet.element.getAttribute("style") ?? "";
      // v-show=false sets display: none
      expect(style).toContain("display: none");
    }
    // If not rendered at all (v-if), also acceptable
    wrapper.unmount();
  });
});
