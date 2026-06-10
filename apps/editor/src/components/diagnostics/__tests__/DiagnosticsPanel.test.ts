import { mount } from "@vue/test-utils";
import type { DiagnosticReport } from "@wechat-flow/contracts";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import DiagnosticsPanel from "../DiagnosticsPanel.vue";

const versionTriple = { coreVersion: "1.0.0", themeVersion: "1.0.0", rulesetVersion: "1.0.0" };

function makeReport(overrides: Partial<DiagnosticReport> = {}): DiagnosticReport {
  return {
    diagnostics: [],
    nodeChangeRecords: [],
    nightRiskIssues: [],
    versionTriple,
    ...overrides,
  };
}

// AC-001: error items use --color-diag-error swatch, warn items use --color-diag-warn
describe("AC-001: 诊断项级别色块", () => {
  it("error 诊断项的色块 class 包含 error 变体", async () => {
    const report = makeReport({
      diagnostics: [
        { severity: "error", ruleId: "R-001", message: "错误消息 A", nodeRef: "#node1" },
        { severity: "error", ruleId: "R-002", message: "错误消息 B" },
        { severity: "warning", ruleId: "R-003", message: "警告消息 C" },
      ],
    });
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: report, isExpanded: true },
    });
    await nextTick();

    const items = wrapper.findAll('[data-testid="diagnostics-list"] .diagnostics-item');
    expect(items.length).toBe(3);

    const errorSwatches = wrapper.findAll(".diagnostics-item__swatch--error");
    expect(errorSwatches.length).toBe(2);

    const warnSwatches = wrapper.findAll(".diagnostics-item__swatch--warning");
    expect(warnSwatches.length).toBe(1);

    wrapper.unmount();
  });

  it("error 色块 CSS var 引用 --color-diag-error（通过 class 名称关联）", async () => {
    const report = makeReport({
      diagnostics: [{ severity: "error", ruleId: "R-001", message: "错误" }],
    });
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: report, isExpanded: true },
    });
    await nextTick();

    const errorSwatch = wrapper.find(".diagnostics-item__swatch--error");
    expect(errorSwatch.exists()).toBe(true);
    // class 命名与 tokens.css 中 --color-diag-error 对应（color=error）
    expect(errorSwatch.classes()).toContain("diagnostics-item__swatch--error");

    wrapper.unmount();
  });

  it("warn 色块 CSS var 引用 --color-diag-warn（通过 class 名称关联）", async () => {
    const report = makeReport({
      diagnostics: [{ severity: "warning", ruleId: "R-002", message: "警告" }],
    });
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: report, isExpanded: true },
    });
    await nextTick();

    const warnSwatch = wrapper.find(".diagnostics-item__swatch--warning");
    expect(warnSwatch.exists()).toBe(true);
    expect(warnSwatch.classes()).toContain("diagnostics-item__swatch--warning");

    wrapper.unmount();
  });
});

// AC-002: isExpanded=false → 32px header only; isExpanded=true → list visible
describe("AC-002: 折叠/展开态", () => {
  it("isExpanded=false 时诊断列表不在 DOM 中", async () => {
    const report = makeReport({
      diagnostics: [{ severity: "error", ruleId: "R-001", message: "错误" }],
    });
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: report, isExpanded: false },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="diagnostics-list"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("isExpanded=true 时诊断列表在 DOM 中且可见", async () => {
    const report = makeReport({
      diagnostics: [{ severity: "error", ruleId: "R-001", message: "错误" }],
    });
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: report, isExpanded: true },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="diagnostics-list"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("标题行始终渲染（height 32px 由 class 控制）", async () => {
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: makeReport(), isExpanded: false },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="diagnostics-header"]').exists()).toBe(true);
    wrapper.unmount();
  });
});

// AC-003: 「查看变更」按钮点击 → show-diff 事件携带 nodeSelector
describe("AC-003: 查看变更链接触发 show-diff 事件", () => {
  it("点击「查看变更」按钮触发 show-diff 事件，携带 nodeRef 值", async () => {
    const report = makeReport({
      diagnostics: [{ severity: "error", ruleId: "R-001", message: "错误", nodeRef: "#node-abc" }],
    });
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: report, isExpanded: true },
    });
    await nextTick();

    await wrapper.find('[data-testid="show-diff-btn"]').trigger("click");
    await nextTick();

    const emitted = wrapper.emitted("show-diff");
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]).toEqual(["#node-abc"]);
    wrapper.unmount();
  });

  it("无 nodeRef 的诊断项不渲染「查看变更」按钮", async () => {
    const report = makeReport({
      diagnostics: [{ severity: "error", ruleId: "R-001", message: "没有 nodeRef" }],
    });
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: report, isExpanded: true },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="show-diff-btn"]').exists()).toBe(false);
    wrapper.unmount();
  });
});

// AC-004: diagnostics 含 error 时折叠态自动触发 toggle 事件
describe("AC-004: 含 error 时自动展开（emit toggle）", () => {
  it("diagnostics 含 error 且 isExpanded=false 时，挂载后 emit toggle", async () => {
    const report = makeReport({
      diagnostics: [{ severity: "error", ruleId: "R-001", message: "错误" }],
    });
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: report, isExpanded: false },
    });
    await nextTick();

    const toggled = wrapper.emitted("toggle");
    expect(toggled).toBeTruthy();
    expect(toggled?.length).toBeGreaterThanOrEqual(1);
    wrapper.unmount();
  });

  it("diagnostics 无 error（仅 warn）且 isExpanded=false 时，挂载后不 emit toggle", async () => {
    const report = makeReport({
      diagnostics: [{ severity: "warning", ruleId: "R-002", message: "警告" }],
    });
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: report, isExpanded: false },
    });
    await nextTick();

    expect(wrapper.emitted("toggle")).toBeFalsy();
    wrapper.unmount();
  });

  it("diagnostics 为空且 isExpanded=false 时，不 emit toggle", async () => {
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: makeReport(), isExpanded: false },
    });
    await nextTick();

    expect(wrapper.emitted("toggle")).toBeFalsy();
    wrapper.unmount();
  });
});

// AC-006: nightRiskIssues 非空 → night-risk-alert CSS class + 风险标记
describe("AC-006: night-risk-alert 状态", () => {
  it("nightRiskIssues 非空时面板具有 night-risk-alert class", async () => {
    const report = makeReport({
      nightRiskIssues: [
        {
          nodeSelector: "#h1",
          contrastRatio: 1.5,
          foreground: "#ffffff",
          background: "#f0f0f0",
          suggestion: "增大对比度",
        },
      ],
    });
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: report, isExpanded: false },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="diagnostics-panel"]').classes()).toContain(
      "diagnostics-panel--night-risk-alert"
    );
    wrapper.unmount();
  });

  it("nightRiskIssues 非空时标题行渲染风险标记元素", async () => {
    const report = makeReport({
      nightRiskIssues: [
        {
          nodeSelector: "#h1",
          contrastRatio: 1.5,
          foreground: "#ffffff",
          background: "#f0f0f0",
          suggestion: "增大对比度",
        },
      ],
    });
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: report, isExpanded: false },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="night-risk-marker"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("nightRiskIssues 为空时无 night-risk-alert class", async () => {
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: makeReport(), isExpanded: false },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="diagnostics-panel"]').classes()).not.toContain(
      "diagnostics-panel--night-risk-alert"
    );
    wrapper.unmount();
  });

  it("nightRiskIssues 非空时标题行显示「夜间风险 N 项」红色计数", async () => {
    const report = makeReport({
      diagnostics: [{ severity: "error", ruleId: "R-001", message: "错误" }],
      nightRiskIssues: [
        {
          nodeSelector: "#h1",
          contrastRatio: 1.5,
          foreground: "#fff",
          background: "#f0f0f0",
          suggestion: "加深颜色",
        },
        {
          nodeSelector: "#h2",
          contrastRatio: 2.0,
          foreground: "#fff",
          background: "#e8e8e8",
          suggestion: "加深颜色",
        },
      ],
    });
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: report, isExpanded: true },
    });
    await nextTick();

    const nightCount = wrapper.find('[data-testid="night-risk-count"]');
    expect(nightCount.exists()).toBe(true);
    expect(nightCount.text()).toContain("2");
    expect(nightCount.classes()).toContain("diagnostics-panel__count--night");
    wrapper.unmount();
  });
});
