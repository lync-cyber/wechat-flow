import "fake-indexeddb/auto";
import { mount } from "@vue/test-utils";
import { closeDb } from "@wechat-flow/core";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { useEditorStore } from "../../../stores/editor.ts";
import EditorShell from "../EditorShell.vue";

vi.mock("@wechat-flow/ruleset", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@wechat-flow/ruleset")>();
  return {
    ...actual,
    lintMarkdown: vi.fn((content: string) => {
      if (content.includes("最佳")) {
        return [
          {
            severity: "warning",
            ruleId: "keyword-lint",
            message: "违规关键词「最佳」",
            matchedKeyword: "最佳",
            location: { line: 1, column: 1 },
          },
        ];
      }
      return [];
    }),
  };
});

afterEach(async () => {
  await closeDb();
  indexedDB.deleteDatabase("wechat-flow-db");
  for (const el of document.body.querySelectorAll('[data-testid="hamburger-btn"]')) {
    el.remove();
  }
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1440 });
});

// ── AC-003: EditorShell diagnostics computed 合并 keyword 命中项 ──────────────

describe("AC-003: EditorShell 合并 keywordDiagnostics 到 diagnostics", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1440,
    });
    setActivePinia(createPinia());
  });

  it("触发 content-keyword-lint 命令后 DiagnosticsPanel 收到含 keyword-lint 项的 diagnostics", async () => {
    const pinia = createPinia();
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [pinia] },
    });
    await nextTick();

    const store = useEditorStore(pinia);
    store.content = "这是最佳方案";
    await nextTick();

    const contextMenu = wrapper.findComponent({ name: "ContextMenu" });
    const onCommand = contextMenu.props("onCommand") as (id: string) => void;
    onCommand("content-keyword-lint");
    await nextTick();

    const diagnosticsPanel = wrapper.findComponent({ name: "DiagnosticsPanel" });
    const diagnosticsReport = diagnosticsPanel.props("diagnostics") as {
      diagnostics: Array<{ ruleId: string; severity: string; matchedKeyword?: string }>;
    };

    expect(
      diagnosticsReport.diagnostics.some(
        (d) => d.ruleId === "keyword-lint" && d.severity === "warning"
      )
    ).toBe(true);

    wrapper.unmount();
  });

  it("未触发 keyword lint 时 diagnostics 不含 keyword-lint 条目", async () => {
    const pinia = createPinia();
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [pinia] },
    });
    await nextTick();

    const diagnosticsPanel = wrapper.findComponent({ name: "DiagnosticsPanel" });
    const diagnosticsReport = diagnosticsPanel.props("diagnostics") as {
      diagnostics: Array<{ ruleId: string }>;
    };

    expect(diagnosticsReport.diagnostics.some((d) => d.ruleId === "keyword-lint")).toBe(false);

    wrapper.unmount();
  });
});
