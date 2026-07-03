import "fake-indexeddb/auto";
import { mount } from "@vue/test-utils";
import { closeDb } from "@wechat-flow/core";
import { createPinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { useToast } from "../../../composables/use-toast.ts";
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

vi.mock("../../../use-cases/export-html.ts", () => ({
  composeExportHtml: vi.fn(),
}));

import { composeExportHtml } from "../../../use-cases/export-html.ts";

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

beforeEach(() => setViewportWidth(1440));

afterEach(async () => {
  await closeDb();
  indexedDB.deleteDatabase("wechat-flow-db");
  for (const el of document.body.querySelectorAll('[data-testid="hamburger-btn"]')) {
    el.remove();
  }
  setViewportWidth(1440);
  vi.clearAllMocks();
  useToast().toasts.value = [];
});

describe("SR-R2-005: onDownloadHtml 错误反馈", () => {
  it("composeExportHtml 抛错时推送 error toast，不产生未处理 rejection", async () => {
    const mockComposeExportHtml = vi.mocked(composeExportHtml);
    mockComposeExportHtml.mockRejectedValueOnce(new Error("render failed"));

    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const topBar = wrapper.findComponent({ name: "TopBar" });
    const onMore = topBar.props("onMore") as () => void;
    onMore();
    await nextTick();

    const contextMenu = wrapper.findComponent({ name: "ContextMenu" });
    const onCommand = contextMenu.props("onCommand") as (id: string) => void | Promise<void>;

    await Promise.resolve(onCommand("export-download-html"));
    await nextTick();
    await nextTick();

    const { toasts } = useToast();
    const errorToast = toasts.value.find((t) => t.type === "error");
    expect(errorToast).toBeDefined();

    wrapper.unmount();
  });

  it("下载成功时不产生 error toast", async () => {
    const mockComposeExportHtml = vi.mocked(composeExportHtml);
    mockComposeExportHtml.mockResolvedValueOnce("<html></html>");

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock");
    URL.revokeObjectURL = vi.fn();

    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const topBar = wrapper.findComponent({ name: "TopBar" });
    const onMore = topBar.props("onMore") as () => void;
    onMore();
    await nextTick();

    const contextMenu = wrapper.findComponent({ name: "ContextMenu" });
    const onCommand = contextMenu.props("onCommand") as (id: string) => void | Promise<void>;

    await Promise.resolve(onCommand("export-download-html"));
    await nextTick();

    const { toasts } = useToast();
    const errorToast = toasts.value.find((t) => t.type === "error");
    expect(errorToast).toBeUndefined();

    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    wrapper.unmount();
  });
});
