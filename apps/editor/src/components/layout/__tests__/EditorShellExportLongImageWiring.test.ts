import "fake-indexeddb/auto";
import { flushPromises, mount } from "@vue/test-utils";
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
  composeExportHtml: vi.fn().mockResolvedValue("<html>rendered</html>"),
}));

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

function makeMockEventSource() {
  const listeners: Record<string, ((e: MessageEvent) => void)[]> = {};
  const es = {
    addEventListener(event: string, cb: (e: MessageEvent) => void) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    },
    close: vi.fn(),
    dispatch(event: string, data: unknown) {
      const msg = new MessageEvent(event, { data: JSON.stringify(data) });
      for (const cb of listeners[event] ?? []) cb(msg);
    },
  };
  return es;
}

describe("SR-R2-002: export-long-image 命令触发 ExportJobPanel 全链路", () => {
  it("EditorShell 挂载后含 ExportJobPanel 组件", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const panel = wrapper.findComponent({ name: "ExportJobPanel" });
    expect(panel.exists()).toBe(true);
    wrapper.unmount();
  });

  it("触发 export-long-image 命令后面板打开、JobProgressBar 展示 running/percent", async () => {
    const originalFetch = globalThis.fetch;
    const fakeFetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ jobId: "job-1" }) });
    globalThis.fetch = fakeFetch as unknown as typeof fetch;

    const mockEs = makeMockEventSource();
    const originalEventSource = globalThis.EventSource;
    globalThis.EventSource = vi.fn().mockReturnValue(mockEs) as unknown as typeof EventSource;

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
    onCommand("export-long-image");
    await flushPromises();

    const panel = wrapper.findComponent({ name: "ExportJobPanel" });
    expect(panel.props("isOpen")).toBe(true);

    mockEs.dispatch("progress", { progress: 55 });
    await nextTick();

    const bar = wrapper.findComponent({ name: "JobProgressBar" });
    expect(bar.props("status")).toBe("running");
    expect(bar.props("percent")).toBe(55);

    globalThis.fetch = originalFetch;
    globalThis.EventSource = originalEventSource;
    wrapper.unmount();
  });

  it("succeeded 后推送成功 toast", async () => {
    const originalFetch = globalThis.fetch;
    const fakeFetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ jobId: "job-2" }) });
    globalThis.fetch = fakeFetch as unknown as typeof fetch;

    const mockEs = makeMockEventSource();
    const originalEventSource = globalThis.EventSource;
    globalThis.EventSource = vi.fn().mockReturnValue(mockEs) as unknown as typeof EventSource;

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
    onCommand("export-long-image");
    await flushPromises();

    mockEs.dispatch("succeeded", { result: { url: "https://cdn.example.com/long.png" } });
    await nextTick();

    const { toasts } = useToast();
    const successToast = toasts.value.find((t) => t.type === "success");
    expect(successToast).toBeDefined();

    const panel = wrapper.findComponent({ name: "ExportJobPanel" });
    const bar = wrapper.findComponent({ name: "JobProgressBar" });
    expect(bar.props("downloadUrl")).toBe("https://cdn.example.com/long.png");
    void panel;

    globalThis.fetch = originalFetch;
    globalThis.EventSource = originalEventSource;
    wrapper.unmount();
  });

  it("failed 后推送 error toast", async () => {
    const originalFetch = globalThis.fetch;
    const fakeFetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ jobId: "job-3" }) });
    globalThis.fetch = fakeFetch as unknown as typeof fetch;

    const mockEs = makeMockEventSource();
    const originalEventSource = globalThis.EventSource;
    globalThis.EventSource = vi.fn().mockReturnValue(mockEs) as unknown as typeof EventSource;

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
    onCommand("export-long-image");
    await flushPromises();

    mockEs.dispatch("failed", { error: { code: "E_TIMEOUT", message: "task timed out" } });
    await nextTick();

    const { toasts } = useToast();
    const errorToast = toasts.value.find((t) => t.type === "error");
    expect(errorToast).toBeDefined();

    globalThis.fetch = originalFetch;
    globalThis.EventSource = originalEventSource;
    wrapper.unmount();
  });

  it("面板关闭事件触发后 isOpen 变为 false", async () => {
    const originalFetch = globalThis.fetch;
    const fakeFetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ jobId: "job-4" }) });
    globalThis.fetch = fakeFetch as unknown as typeof fetch;

    const mockEs = makeMockEventSource();
    const originalEventSource = globalThis.EventSource;
    globalThis.EventSource = vi.fn().mockReturnValue(mockEs) as unknown as typeof EventSource;

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
    onCommand("export-long-image");
    await flushPromises();

    mockEs.dispatch("succeeded", { result: { url: "https://cdn.example.com/long.png" } });
    await nextTick();

    let panel = wrapper.findComponent({ name: "ExportJobPanel" });
    expect(panel.props("isOpen")).toBe(true);

    panel.vm.$emit("close");
    await nextTick();

    panel = wrapper.findComponent({ name: "ExportJobPanel" });
    expect(panel.props("isOpen")).toBe(false);

    globalThis.fetch = originalFetch;
    globalThis.EventSource = originalEventSource;
    wrapper.unmount();
  });
});
