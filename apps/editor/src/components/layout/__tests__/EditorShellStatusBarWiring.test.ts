import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mount } from "@vue/test-utils";
import { closeDb } from "@wechat-flow/core";
import { createPinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
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
});

describe("AC-004: EditorShell 字面模板接线 StatusBar + DiagnosticsPanel", () => {
  it("EditorShell 模板含字面 <StatusBar :diagnostics 绑定", () => {
    const shellPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../EditorShell.vue"
    );
    const source = readFileSync(shellPath, "utf-8");
    expect(source).toMatch(/<StatusBar\s/);
    expect(source).toMatch(/:diagnostics=/);
    expect(source).toMatch(/@toggle-diagnostics=/);
  });

  it("EditorShell 挂载后含 StatusBar 组件", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const statusBar = wrapper.findComponent({ name: "StatusBar" });
    expect(statusBar.exists()).toBe(true);
    wrapper.unmount();
  });

  it("StatusBar 接收 diagnostics prop（与 DiagnosticsPanel 数据共享同一来源）", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const statusBar = wrapper.findComponent({ name: "StatusBar" });
    expect(statusBar.exists()).toBe(true);
    const diagnostics = statusBar.props("diagnostics");
    expect(diagnostics).toBeDefined();
    expect(typeof diagnostics).toBe("object");
    expect(Array.isArray((diagnostics as { diagnostics: unknown[] }).diagnostics)).toBe(true);

    wrapper.unmount();
  });

  it("DiagnosticsPanel 与 StatusBar 共享同一 diagnostics 数据源", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const statusBar = wrapper.findComponent({ name: "StatusBar" });
    const diagPanel = wrapper.findComponent({ name: "DiagnosticsPanel" });

    expect(statusBar.exists()).toBe(true);
    expect(diagPanel.exists()).toBe(true);

    const sbDiagnostics = statusBar.props("diagnostics");
    const dpDiagnostics = diagPanel.props("diagnostics");

    expect(sbDiagnostics).toBe(dpDiagnostics);

    wrapper.unmount();
  });

  it("点击 StatusBar compat-summary 后 DiagnosticsPanel isExpanded 切换为 true", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const diagPanel = wrapper.findComponent({ name: "DiagnosticsPanel" });
    expect(diagPanel.props("isExpanded")).toBe(false);

    const statusBar = wrapper.findComponent({ name: "StatusBar" });
    await statusBar.find('[data-testid="compat-summary"]').trigger("click");
    await nextTick();

    expect(diagPanel.props("isExpanded")).toBe(true);
    wrapper.unmount();
  });
});
