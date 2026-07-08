import { mount } from "@vue/test-utils";
import type { DiagnosticReport } from "@wechat-flow/contracts";
import { describe, expect, it, vi } from "vitest";
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

// UC-013: issue 行「查看」链接 → item-click 事件（跳转/定位对应节点）
describe("UC-013: 查看链接触发 item-click 事件", () => {
  it("点击「查看」按钮触发 item-click 事件，携带 nodeRef 值", async () => {
    const report = makeReport({
      diagnostics: [{ severity: "error", ruleId: "R-001", message: "错误", nodeRef: "DIV" }],
    });
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: report, isExpanded: true },
    });
    await nextTick();

    await wrapper.find('[data-testid="view-btn"]').trigger("click");
    await nextTick();

    const emitted = wrapper.emitted("item-click");
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]).toEqual(["DIV"]);
    wrapper.unmount();
  });

  it("无 nodeRef 的诊断项不渲染「查看」按钮", async () => {
    const report = makeReport({
      diagnostics: [{ severity: "error", ruleId: "R-001", message: "没有 nodeRef" }],
    });
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: report, isExpanded: true },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="view-btn"]').exists()).toBe(false);
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

  it("nightRiskIssues 非空时标题行不再显示红色计数（计数唯一权威 = StatusBar，见 T-170 AC-001）", async () => {
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

    expect(wrapper.find('[data-testid="night-risk-count"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="night-risk-marker"]').exists()).toBe(true);
    wrapper.unmount();
  });
});

// ── T-170 AC-001: 折叠态标题行不渲染计数段（计数唯一权威 = StatusBar） ──────────
describe("T-170 AC-001: 标题行不渲染严重/提醒/夜间风险计数段", () => {
  function reportWithMixed(): DiagnosticReport {
    return makeReport({
      diagnostics: [
        { severity: "error", ruleId: "R-001", message: "错误" },
        { severity: "warning", ruleId: "R-002", message: "警告" },
      ],
      nightRiskIssues: [
        {
          nodeSelector: "#h1",
          contrastRatio: 1.5,
          foreground: "#fff",
          background: "#eee",
          suggestion: "加深颜色",
        },
      ],
    });
  }

  it("折叠态（isExpanded=false）标题行不含 error-count/warn-count/night-risk-count 元素", async () => {
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: reportWithMixed(), isExpanded: false },
    });
    await nextTick();

    const header = wrapper.find('[data-testid="diagnostics-header"]');
    expect(header.find('[data-testid="error-count"]').exists()).toBe(false);
    expect(header.find('[data-testid="warn-count"]').exists()).toBe(false);
    expect(header.find('[data-testid="night-risk-count"]').exists()).toBe(false);
    expect(header.text()).not.toContain("严重");
    expect(header.text()).not.toContain("提醒");
    wrapper.unmount();
  });

  it("展开态（isExpanded=true）标题行同样不含计数元素——计数仅出现在展开列表分组头", async () => {
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: reportWithMixed(), isExpanded: true },
    });
    await nextTick();

    const header = wrapper.find('[data-testid="diagnostics-header"]');
    expect(header.find('[data-testid="error-count"]').exists()).toBe(false);
    expect(header.find('[data-testid="warn-count"]').exists()).toBe(false);
    expect(header.find('[data-testid="night-risk-count"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("标题行仍保留夜间风险月亮标记（无计数文本）", async () => {
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: reportWithMixed(), isExpanded: false },
    });
    await nextTick();

    const marker = wrapper.find('[data-testid="night-risk-marker"]');
    expect(marker.exists()).toBe(true);
    expect(marker.text()).not.toMatch(/\d/);
    wrapper.unmount();
  });
});

// ── T-170 AC-002: 展开列表按四分组渲染 + 夜间风险明细 ────────────────────────
describe("T-170 AC-002: 展开列表按四分组渲染 + 夜间风险明细条目", () => {
  it("展开列表含兼容性/可读性/违规词/夜间风险四个非空分组头，各自计数正确", async () => {
    const report = makeReport({
      diagnostics: [
        { severity: "error", ruleId: "R-001", message: "兼容性错误" },
        { severity: "warning", ruleId: "readability-font-size-min", message: "字号过小" },
        {
          severity: "warning",
          ruleId: "keyword-lint",
          message: "违规词命中",
          matchedKeyword: "x",
        },
      ],
      nightRiskIssues: [
        {
          nodeSelector: "#h1",
          contrastRatio: 1.8,
          foreground: "#fff",
          background: "#ddd",
          suggestion: "加深文字颜色",
        },
      ],
    });
    const wrapper = mount(DiagnosticsPanel, { props: { diagnostics: report, isExpanded: true } });
    await nextTick();

    expect(wrapper.find('[data-testid="group-header-compat"]').text()).toContain("兼容性 1 项");
    expect(wrapper.find('[data-testid="group-header-readability"]').text()).toContain(
      "可读性 1 项"
    );
    expect(wrapper.find('[data-testid="group-header-keyword"]').text()).toContain("违规词 1 项");
    expect(wrapper.find('[data-testid="group-header-night-risk"]').text()).toContain(
      "夜间风险 1 项"
    );
    wrapper.unmount();
  });

  it("空分组不渲染分组头", async () => {
    const report = makeReport({
      diagnostics: [{ severity: "error", ruleId: "R-001", message: "兼容性错误" }],
    });
    const wrapper = mount(DiagnosticsPanel, { props: { diagnostics: report, isExpanded: true } });
    await nextTick();

    expect(wrapper.find('[data-testid="group-header-compat"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="group-header-readability"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="group-header-keyword"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="group-header-night-risk"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("夜间风险组逐项渲染明细条目（节点选择器 + 对比度 + 建议），此前全 UI 无渲染出口", async () => {
    const report = makeReport({
      nightRiskIssues: [
        {
          nodeSelector: "#h1",
          contrastRatio: 1.8,
          foreground: "#fff",
          background: "#ddd",
          suggestion: "加深文字颜色",
        },
        {
          nodeSelector: "p.body",
          contrastRatio: 2.3,
          foreground: "#eee",
          background: "#ccc",
          suggestion: "提高对比度",
        },
      ],
    });
    const wrapper = mount(DiagnosticsPanel, { props: { diagnostics: report, isExpanded: true } });
    await nextTick();

    const items = wrapper.findAll('[data-testid="night-risk-item"]');
    expect(items.length).toBe(2);
    expect(items[0]?.text()).toContain("#h1");
    expect(items[0]?.text()).toContain("1.8");
    expect(items[0]?.text()).toContain("加深文字颜色");
    expect(items[1]?.text()).toContain("p.body");
    wrapper.unmount();
  });

  it("夜间风险条目「查看」按钮点击触发 item-click 事件，携带 nodeSelector", async () => {
    const report = makeReport({
      nightRiskIssues: [
        {
          nodeSelector: "#h1",
          contrastRatio: 1.8,
          foreground: "#fff",
          background: "#ddd",
          suggestion: "加深文字颜色",
        },
      ],
    });
    const wrapper = mount(DiagnosticsPanel, { props: { diagnostics: report, isExpanded: true } });
    await nextTick();

    await wrapper.find('[data-testid="night-risk-view-btn"]').trigger("click");
    await nextTick();

    const emitted = wrapper.emitted("item-click");
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]).toEqual(["#h1"]);
    wrapper.unmount();
  });
});

// ── T-170 AC-003: anchorGroup 展开时滚动锚定至对应分组头 ─────────────────────
describe("T-170 AC-003: anchorGroup 驱动滚动锚定", () => {
  it("传入 anchorGroup 且 isExpanded=true 时，对应分组头元素调用 scrollIntoView", async () => {
    const scrollSpy = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollSpy;

    const report = makeReport({
      nightRiskIssues: [
        {
          nodeSelector: "#h1",
          contrastRatio: 1.8,
          foreground: "#fff",
          background: "#ddd",
          suggestion: "加深文字颜色",
        },
      ],
    });
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: report, isExpanded: true, anchorGroup: "night-risk" },
    });
    await nextTick();
    await nextTick();
    await nextTick();

    expect(scrollSpy).toHaveBeenCalled();
    const target = wrapper.find('[data-testid="group-header-night-risk"]').element;
    expect(scrollSpy.mock.instances).toContain(target);

    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    wrapper.unmount();
  });

  it("anchorGroup 未传入时不触发 scrollIntoView", async () => {
    const scrollSpy = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollSpy;

    const report = makeReport({
      diagnostics: [{ severity: "error", ruleId: "R-001", message: "错误" }],
    });
    const wrapper = mount(DiagnosticsPanel, { props: { diagnostics: report, isExpanded: true } });
    await nextTick();
    await nextTick();
    await nextTick();

    expect(scrollSpy).not.toHaveBeenCalled();

    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    wrapper.unmount();
  });
});
