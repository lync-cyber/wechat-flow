import { mount } from "@vue/test-utils";
import type { DiagnosticReport, NodeChangeRecord } from "@wechat-flow/contracts";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import CompatibilityDiffView from "../CompatibilityDiffView.vue";
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

const sampleRecord: NodeChangeRecord = {
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
};

// AC-003: clicking show-diff opens modal with non-empty before/after and visible ruleId
describe("AC-003: CompatibilityDiffView Modal 内容", () => {
  it("isOpen=true 时 Modal 在 DOM 中渲染", async () => {
    const wrapper = mount(CompatibilityDiffView, {
      props: {
        isOpen: true,
        nodeSelector: "#heading-1",
        nodeChangeRecords: [sampleRecord],
        triggerRule: "strip-color",
      },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="compat-diff-modal"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("isOpen=false 时 Modal 不在 DOM 中", async () => {
    const wrapper = mount(CompatibilityDiffView, {
      props: {
        isOpen: false,
        nodeSelector: "#heading-1",
        nodeChangeRecords: [sampleRecord],
      },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="compat-diff-modal"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("before 栏 HTML 内容非空", async () => {
    const wrapper = mount(CompatibilityDiffView, {
      props: {
        isOpen: true,
        nodeSelector: "#heading-1",
        nodeChangeRecords: [sampleRecord],
      },
    });
    await nextTick();

    const beforeEl = wrapper.find('[data-testid="before-html"]');
    expect(beforeEl.exists()).toBe(true);
    expect(beforeEl.text().trim()).not.toBe("");
    wrapper.unmount();
  });

  it("after 栏 HTML 内容非空", async () => {
    const wrapper = mount(CompatibilityDiffView, {
      props: {
        isOpen: true,
        nodeSelector: "#heading-1",
        nodeChangeRecords: [sampleRecord],
      },
    });
    await nextTick();

    const afterEl = wrapper.find('[data-testid="after-html"]');
    expect(afterEl.exists()).toBe(true);
    expect(afterEl.text().trim()).not.toBe("");
    wrapper.unmount();
  });

  it("triggerRuleId 在 Modal 内可见", async () => {
    const wrapper = mount(CompatibilityDiffView, {
      props: {
        isOpen: true,
        nodeSelector: "#heading-1",
        nodeChangeRecords: [sampleRecord],
        triggerRule: "strip-color",
      },
    });
    await nextTick();

    const ruleEl = wrapper.find('[data-testid="trigger-rule"]');
    expect(ruleEl.exists()).toBe(true);
    expect(ruleEl.text()).toContain("strip-color");
    wrapper.unmount();
  });

  it("点击关闭按钮触发 close 事件", async () => {
    const onClose = vi.fn();
    const wrapper = mount(CompatibilityDiffView, {
      props: {
        isOpen: true,
        nodeSelector: "#heading-1",
        nodeChangeRecords: [sampleRecord],
        onClose,
      },
    });
    await nextTick();

    await wrapper.find('[data-testid="footer-close-btn"]').trigger("click");
    await nextTick();

    expect(onClose).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("Modal 标题包含 nodeSelector", async () => {
    const wrapper = mount(CompatibilityDiffView, {
      props: {
        isOpen: true,
        nodeSelector: "#my-selector",
        nodeChangeRecords: [sampleRecord],
      },
    });
    await nextTick();

    const header = wrapper.find('[data-testid="compat-diff-header"]');
    expect(header.text()).toContain("#my-selector");
    wrapper.unmount();
  });
});

// AC-005: nodeChangeRecords 非空 → before/after 双栏对比；为空 → 记录区隐藏
describe("AC-005: nodeChangeRecords 展示与隐藏", () => {
  it("nodeChangeRecords 非空时展示 change-records 区域", async () => {
    const wrapper = mount(CompatibilityDiffView, {
      props: {
        isOpen: true,
        nodeSelector: "#h1",
        nodeChangeRecords: [sampleRecord],
      },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="change-records"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("nodeChangeRecords 非空时每条记录渲染一行（2 条 → 2 行）", async () => {
    const record2: NodeChangeRecord = {
      nodeSelector: "#p-1",
      before: "<p>text</p>",
      after: "<p>text</p>",
      attrDiff: [],
      triggerRuleId: "sanitize-class",
    };
    const wrapper = mount(CompatibilityDiffView, {
      props: {
        isOpen: true,
        nodeSelector: "#h1",
        nodeChangeRecords: [sampleRecord, record2],
      },
    });
    await nextTick();

    const rows = wrapper.findAll('[data-testid^="record-row-"]');
    expect(rows.length).toBe(2);
    wrapper.unmount();
  });

  it("nodeChangeRecords 为空时记录区域隐藏（no-records 可见）", async () => {
    const wrapper = mount(CompatibilityDiffView, {
      props: {
        isOpen: true,
        nodeSelector: "#h1",
        nodeChangeRecords: [],
      },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="change-records"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="no-records"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("before 栏用 --color-surface 背景 class，after 栏用 --color-success-subtle 背景 class", async () => {
    const wrapper = mount(CompatibilityDiffView, {
      props: {
        isOpen: true,
        nodeSelector: "#h1",
        nodeChangeRecords: [sampleRecord],
      },
    });
    await nextTick();

    const beforeCol = wrapper.find('[data-testid="before-col"]');
    const afterCol = wrapper.find('[data-testid="after-col"]');
    expect(beforeCol.classes()).toContain("compat-diff-view__col--before");
    expect(afterCol.classes()).toContain("compat-diff-view__col--after");
    wrapper.unmount();
  });
});

// Integration: DiagnosticsPanel show-diff event → CompatibilityDiffView opens
describe("AC-003 集成: DiagnosticsPanel show-diff 触发 Modal 开启（父组件协调）", () => {
  it("DiagnosticsPanel 发出 show-diff 事件且携带正确 nodeSelector", async () => {
    const report = makeReport({
      diagnostics: [
        { severity: "error", ruleId: "R-001", message: "颜色被过滤", nodeRef: "#heading-1" },
      ],
    });
    const wrapper = mount(DiagnosticsPanel, {
      props: { diagnostics: report, isExpanded: true },
    });
    await nextTick();

    await wrapper.find('[data-testid="show-diff-btn"]').trigger("click");
    await nextTick();

    const emitted = wrapper.emitted("show-diff");
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]).toEqual(["#heading-1"]);
    wrapper.unmount();
  });
});
