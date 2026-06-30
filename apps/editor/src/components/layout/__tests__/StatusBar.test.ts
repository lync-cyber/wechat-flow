import { mount } from "@vue/test-utils";
import type { DiagnosticReport } from "@wechat-flow/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import StatusBar from "../StatusBar.vue";

function emptyReport(): DiagnosticReport {
  return {
    diagnostics: [],
    nodeChangeRecords: [],
    nightRiskIssues: [],
    versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
  };
}

function reportWithError(): DiagnosticReport {
  return {
    diagnostics: [{ severity: "error", ruleId: "r1", message: "bad style" }],
    nodeChangeRecords: [],
    nightRiskIssues: [],
    versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
  };
}

describe("AC-001: 无兼容性问题时摘要颜色为 --color-text-muted", () => {
  it("兼容性摘要区域有 color-text-muted CSS 变量颜色类", () => {
    const wrapper = mount(StatusBar, {
      props: {
        metrics: { chineseChars: 100, totalChars: 100, readMinutes: 1 },
        diagnostics: emptyReport(),
        isDiagnosticsExpanded: false,
      },
    });

    const compat = wrapper.find('[data-testid="compat-summary"]');
    expect(compat.exists()).toBe(true);
    const el = compat.element as HTMLElement;
    const hasClass = compat.classes().some((c) => c.includes("muted"));
    const hasStyle =
      el.style.color.includes("--color-text-muted") || el.style.color === "var(--color-text-muted)";
    const hasAttr = el.getAttribute("data-color") === "muted";
    expect(hasClass || hasStyle || hasAttr).toBe(true);
  });
});

describe("AC-002: 有 error 诊断时摘要颜色为 --color-error，显示严重1项", () => {
  it("1 条 error 时摘要文字包含严重1项", () => {
    const wrapper = mount(StatusBar, {
      props: {
        metrics: { chineseChars: 100, totalChars: 100, readMinutes: 1 },
        diagnostics: reportWithError(),
        isDiagnosticsExpanded: false,
      },
    });

    const compat = wrapper.find('[data-testid="compat-summary"]');
    expect(compat.text()).toContain("严重 1 项");
  });

  it("1 条 error 时摘要区域使用 --color-error 颜色", () => {
    const wrapper = mount(StatusBar, {
      props: {
        metrics: { chineseChars: 100, totalChars: 100, readMinutes: 1 },
        diagnostics: reportWithError(),
        isDiagnosticsExpanded: false,
      },
    });

    const compat = wrapper.find('[data-testid="compat-summary"]');
    const el = compat.element as HTMLElement;
    const hasClass = compat.classes().some((c) => c.includes("error"));
    const hasStyle =
      el.style.color.includes("--color-error") || el.style.color === "var(--color-error)";
    const hasAttr = el.getAttribute("data-color") === "error";
    expect(hasClass || hasStyle || hasAttr).toBe(true);
  });
});

describe("AC-003: 点击兼容性摘要区域触发 toggle-diagnostics 事件", () => {
  it("点击摘要区域 emit toggle-diagnostics", async () => {
    const wrapper = mount(StatusBar, {
      props: {
        metrics: { chineseChars: 100, totalChars: 100, readMinutes: 1 },
        diagnostics: emptyReport(),
        isDiagnosticsExpanded: false,
      },
    });

    await wrapper.find('[data-testid="compat-summary"]').trigger("click");
    const emitted = wrapper.emitted("toggle-diagnostics");
    expect(emitted).toBeTruthy();
    expect(emitted?.length).toBeGreaterThanOrEqual(1);
  });
});

// ── T-052 新增 AC-001..AC-003 ──────────────────────────────────────────────

function reportWithWarn(): DiagnosticReport {
  return {
    diagnostics: [{ severity: "warning", ruleId: "w1", message: "position:fixed 不兼容" }],
    nodeChangeRecords: [],
    nightRiskIssues: [],
    versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
  };
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
}

describe("T-052 AC-001: 三态状态机 class（idle / warn / error）", () => {
  it("diagnostics 为空时状态栏根元素有 status-bar--idle class", () => {
    const wrapper = mount(StatusBar, {
      props: {
        metrics: { chineseChars: 0, totalChars: 0, readMinutes: 0 },
        diagnostics: emptyReport(),
        isDiagnosticsExpanded: false,
      },
    });
    expect(wrapper.find('[data-testid="status-bar-root"]').classes()).toContain("status-bar--idle");
  });

  it("diagnostics 含 warning 时状态栏根元素有 status-bar--warn class", () => {
    const wrapper = mount(StatusBar, {
      props: {
        metrics: { chineseChars: 0, totalChars: 0, readMinutes: 0 },
        diagnostics: reportWithWarn(),
        isDiagnosticsExpanded: false,
      },
    });
    expect(wrapper.find('[data-testid="status-bar-root"]').classes()).toContain("status-bar--warn");
  });

  it("diagnostics 含 error 时状态栏根元素有 status-bar--error class", () => {
    const wrapper = mount(StatusBar, {
      props: {
        metrics: { chineseChars: 0, totalChars: 0, readMinutes: 0 },
        diagnostics: reportWithError(),
        isDiagnosticsExpanded: false,
      },
    });
    expect(wrapper.find('[data-testid="status-bar-root"]').classes()).toContain(
      "status-bar--error"
    );
  });

  it("error 优先于 warn — 同时含 error 和 warning 时只有 status-bar--error class", () => {
    const mixed: DiagnosticReport = {
      diagnostics: [
        { severity: "error", ruleId: "e1", message: "err" },
        { severity: "warning", ruleId: "w1", message: "warn" },
      ],
      nodeChangeRecords: [],
      nightRiskIssues: [],
      versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
    };
    const wrapper = mount(StatusBar, {
      props: {
        metrics: { chineseChars: 0, totalChars: 0, readMinutes: 0 },
        diagnostics: mixed,
        isDiagnosticsExpanded: false,
      },
    });
    const root = wrapper.find('[data-testid="status-bar-root"]');
    expect(root.classes()).toContain("status-bar--error");
    expect(root.classes()).not.toContain("status-bar--warn");
    expect(root.classes()).not.toContain("status-bar--idle");
  });
});

describe("T-052 AC-002: 平板断点（< 768px）图标降级", () => {
  beforeEach(() => setViewportWidth(1440));
  afterEach(() => setViewportWidth(1440));

  it("桌面视口（≥ 768px）时 compat-icon 不渲染，compat-summary 文字可见", async () => {
    setViewportWidth(1440);
    const wrapper = mount(StatusBar, {
      props: {
        metrics: { chineseChars: 50, totalChars: 50, readMinutes: 1 },
        diagnostics: emptyReport(),
        isDiagnosticsExpanded: false,
      },
    });
    await nextTick();
    expect(wrapper.find('[data-testid="compat-summary"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="compat-icon"]').exists()).toBe(false);
  });

  it("平板视口（< 768px）时 compat-icon 渲染，compat-summary 文字不渲染", async () => {
    setViewportWidth(600);
    window.dispatchEvent(new Event("resize"));
    const wrapper = mount(StatusBar, {
      props: {
        metrics: { chineseChars: 50, totalChars: 50, readMinutes: 1 },
        diagnostics: emptyReport(),
        isDiagnosticsExpanded: false,
      },
      attachTo: document.body,
    });
    await nextTick();
    expect(wrapper.find('[data-testid="compat-icon"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="compat-summary"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("平板视口下存在 compat-tooltip 元素（内容可通过 title 或子元素访问）", async () => {
    setViewportWidth(600);
    window.dispatchEvent(new Event("resize"));
    const wrapper = mount(StatusBar, {
      props: {
        metrics: { chineseChars: 50, totalChars: 50, readMinutes: 1 },
        diagnostics: reportWithWarn(),
        isDiagnosticsExpanded: false,
      },
      attachTo: document.body,
    });
    await nextTick();
    const icon = wrapper.find('[data-testid="compat-icon"]');
    expect(icon.exists()).toBe(true);
    const tooltipEl = wrapper.find('[data-testid="compat-tooltip"]');
    const titleAttr = (icon.element as HTMLElement).getAttribute("title");
    expect(tooltipEl.exists() || (titleAttr !== null && titleAttr.length > 0)).toBe(true);
    wrapper.unmount();
  });
});

describe("T-052 AC-003: 违规内容在图标旁显示警告色标记 + tooltip 文字", () => {
  beforeEach(() => setViewportWidth(600));
  afterEach(() => setViewportWidth(1440));

  it("平板视口 + 含 warning 诊断时 compat-icon 有警告色标记 class", async () => {
    window.dispatchEvent(new Event("resize"));
    const wrapper = mount(StatusBar, {
      props: {
        metrics: { chineseChars: 50, totalChars: 50, readMinutes: 1 },
        diagnostics: reportWithWarn(),
        isDiagnosticsExpanded: false,
      },
      attachTo: document.body,
    });
    await nextTick();
    const icon = wrapper.find('[data-testid="compat-icon"]');
    expect(icon.exists()).toBe(true);
    const classes = icon.classes().join(" ");
    const dataState = (icon.element as HTMLElement).getAttribute("data-state");
    expect(classes.includes("warn") || classes.includes("error") || dataState !== null).toBe(true);
    wrapper.unmount();
  });

  it("平板视口 + 含 warning 诊断时 tooltip 文字描述违规内容（包含诊断 message）", async () => {
    window.dispatchEvent(new Event("resize"));
    const wrapper = mount(StatusBar, {
      props: {
        metrics: { chineseChars: 50, totalChars: 50, readMinutes: 1 },
        diagnostics: reportWithWarn(),
        isDiagnosticsExpanded: false,
      },
      attachTo: document.body,
    });
    await nextTick();
    const icon = wrapper.find('[data-testid="compat-icon"]');
    expect(icon.exists()).toBe(true);
    const titleAttr = (icon.element as HTMLElement).getAttribute("title") ?? "";
    const tooltipEl = wrapper.find('[data-testid="compat-tooltip"]');
    const tooltipText = tooltipEl.exists() ? tooltipEl.text() : titleAttr;
    expect(tooltipText).toContain("position:fixed 不兼容");
    wrapper.unmount();
  });

  it("平板视口 + 含 error 诊断时 compat-icon 携带 status-bar__compat--error 或类似 error 状态标记", async () => {
    window.dispatchEvent(new Event("resize"));
    const wrapper = mount(StatusBar, {
      props: {
        metrics: { chineseChars: 50, totalChars: 50, readMinutes: 1 },
        diagnostics: reportWithError(),
        isDiagnosticsExpanded: false,
      },
      attachTo: document.body,
    });
    await nextTick();
    const icon = wrapper.find('[data-testid="compat-icon"]');
    expect(icon.exists()).toBe(true);
    const hasErrorMarker =
      icon.classes().some((c) => c.includes("error")) ||
      (icon.element as HTMLElement).getAttribute("data-state") === "error";
    expect(hasErrorMarker).toBe(true);
    wrapper.unmount();
  });
});

describe("T-066 AC-004/005: 字数统计格式", () => {
  it("AC-004: 中英混排显示 '{chineseChars} 字 / {totalChars} 字符' 格式", () => {
    const wrapper = mount(StatusBar, {
      props: {
        metrics: { chineseChars: 5, totalChars: 10, readMinutes: 1 },
        diagnostics: emptyReport(),
        isDiagnosticsExpanded: false,
      },
    });
    const wc = wrapper.find('[data-testid="word-count"]');
    expect(wc.text()).toContain("5 字 / 10 字符");
  });

  it("AC-005: 空文档显示 '0 字 / 0 字符'", () => {
    const wrapper = mount(StatusBar, {
      props: {
        metrics: { chineseChars: 0, totalChars: 0, readMinutes: 1 },
        diagnostics: emptyReport(),
        isDiagnosticsExpanded: false,
      },
    });
    const wc = wrapper.find('[data-testid="word-count"]');
    expect(wc.text()).toContain("0 字 / 0 字符");
  });
});
