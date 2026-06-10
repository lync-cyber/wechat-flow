import "fake-indexeddb/auto";
import { mount } from "@vue/test-utils";
import { closeDb } from "@wechat-flow/core";
import { createPinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import EditorShell from "../EditorShell.vue";

vi.mock("../../../use-cases/render.ts", () => ({
  composeRender: vi.fn().mockResolvedValue({
    html: "<p>preview</p>",
    nodeLocations: [],
    versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
    report: {
      diagnostics: [
        {
          severity: "error",
          ruleId: "strip-color",
          message: "颜色被过滤",
          nodeRef: "#heading-1",
        },
      ],
      nodeChangeRecords: [
        {
          nodeSelector: "#heading-1",
          before: '<h1 style="color:red;font-size:24px">标题</h1>',
          after: '<h1 style="font-size:24px">标题</h1>',
          attrDiff: [
            {
              attrName: "style",
              op: "modify",
              oldValue: "color:red;font-size:24px",
              newValue: "font-size:24px",
            },
          ],
          triggerRuleId: "strip-color",
        },
      ],
      nightRiskIssues: [],
      versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
    },
  }),
}));

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: 1440,
  });
});

afterEach(async () => {
  await closeDb();
  indexedDB.deleteDatabase("wechat-flow-db");
  for (const el of document.body.querySelectorAll('[data-testid="hamburger-btn"]')) {
    el.remove();
  }
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1440 });
  vi.clearAllMocks();
});

describe("AC-003 wiring: EditorShell 接线 CompatibilityDiffView", () => {
  it("初始挂载时 compat-diff-modal 不在 DOM 中", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="compat-diff-modal"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("点击「查看变更」后 compat-diff-modal 出现在 DOM 中", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    // Expand the diagnostics panel
    const diagPanel = wrapper.findComponent({ name: "DiagnosticsPanel" });
    expect(diagPanel.exists()).toBe(true);
    await diagPanel.find('[data-testid="toggle-btn"]').trigger("click");
    await nextTick();

    // Trigger updatePreview to populate the store with nodeChangeRecords
    const sourcePane = wrapper.findComponent({ name: "SourcePane" });
    const onValueChange = sourcePane.props("onValueChange") as (value: string) => void;
    onValueChange("# 标题");
    await nextTick();
    await nextTick();

    // Click "查看变更" button on the first diagnostic item
    const showDiffBtn = wrapper.find('[data-testid="show-diff-btn"]');
    expect(showDiffBtn.exists()).toBe(true);
    await showDiffBtn.trigger("click");
    await nextTick();

    expect(wrapper.find('[data-testid="compat-diff-modal"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("Modal 打开后 before 栏内容非空", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const diagPanel = wrapper.findComponent({ name: "DiagnosticsPanel" });
    await diagPanel.find('[data-testid="toggle-btn"]').trigger("click");
    await nextTick();

    const sourcePane = wrapper.findComponent({ name: "SourcePane" });
    const onValueChange = sourcePane.props("onValueChange") as (value: string) => void;
    onValueChange("# 标题");
    await nextTick();
    await nextTick();

    await wrapper.find('[data-testid="show-diff-btn"]').trigger("click");
    await nextTick();

    const beforeEl = wrapper.find('[data-testid="before-html"]');
    expect(beforeEl.exists()).toBe(true);
    expect(beforeEl.text().trim()).not.toBe("");
    wrapper.unmount();
  });

  it("Modal 打开后 after 栏内容非空", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const diagPanel = wrapper.findComponent({ name: "DiagnosticsPanel" });
    await diagPanel.find('[data-testid="toggle-btn"]').trigger("click");
    await nextTick();

    const sourcePane = wrapper.findComponent({ name: "SourcePane" });
    const onValueChange = sourcePane.props("onValueChange") as (value: string) => void;
    onValueChange("# 标题");
    await nextTick();
    await nextTick();

    await wrapper.find('[data-testid="show-diff-btn"]').trigger("click");
    await nextTick();

    const afterEl = wrapper.find('[data-testid="after-html"]');
    expect(afterEl.exists()).toBe(true);
    expect(afterEl.text().trim()).not.toBe("");
    wrapper.unmount();
  });

  it("Modal 打开后 triggerRuleId 在 trigger-rule 区域可见", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const diagPanel = wrapper.findComponent({ name: "DiagnosticsPanel" });
    await diagPanel.find('[data-testid="toggle-btn"]').trigger("click");
    await nextTick();

    const sourcePane = wrapper.findComponent({ name: "SourcePane" });
    const onValueChange = sourcePane.props("onValueChange") as (value: string) => void;
    onValueChange("# 标题");
    await nextTick();
    await nextTick();

    await wrapper.find('[data-testid="show-diff-btn"]').trigger("click");
    await nextTick();

    const triggerRuleEl = wrapper.find('[data-testid="trigger-rule"]');
    expect(triggerRuleEl.exists()).toBe(true);
    expect(triggerRuleEl.text()).toContain("strip-color");
    wrapper.unmount();
  });

  it("点击关闭按钮后 Modal 从 DOM 消失", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const diagPanel = wrapper.findComponent({ name: "DiagnosticsPanel" });
    await diagPanel.find('[data-testid="toggle-btn"]').trigger("click");
    await nextTick();

    const sourcePane = wrapper.findComponent({ name: "SourcePane" });
    const onValueChange = sourcePane.props("onValueChange") as (value: string) => void;
    onValueChange("# 标题");
    await nextTick();
    await nextTick();

    await wrapper.find('[data-testid="show-diff-btn"]').trigger("click");
    await nextTick();

    expect(wrapper.find('[data-testid="compat-diff-modal"]').exists()).toBe(true);

    await wrapper.find('[data-testid="footer-close-btn"]').trigger("click");
    await nextTick();

    expect(wrapper.find('[data-testid="compat-diff-modal"]').exists()).toBe(false);
    wrapper.unmount();
  });
});
