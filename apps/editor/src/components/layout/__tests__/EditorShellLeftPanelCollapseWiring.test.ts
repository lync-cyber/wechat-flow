import "fake-indexeddb/auto";
import { mount } from "@vue/test-utils";
import { closeDb, loadLeftPanelCollapsed } from "@wechat-flow/core";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import type { CommandDefinition } from "../../../lib/command-registry.ts";
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

beforeEach(() => {
  setViewportWidth(1440);
  setActivePinia(createPinia());
});

afterEach(async () => {
  await closeDb();
  indexedDB.deleteDatabase("wechat-flow-db");
  for (const el of document.body.querySelectorAll('[data-testid="hamburger-btn"]')) {
    el.remove();
  }
  setViewportWidth(1440);
  vi.clearAllMocks();
});

describe("AC-002: view-collapse-left 命令面板接线 + 左栏收起按钮双向同步", () => {
  it("初始展开态：左栏渲染 Tab 头，不渲染 rail", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="tab-theme"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="left-panel-rail"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("命令面板执行 view-collapse-left 后左栏切换为 rail 形态", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const commandPalette = wrapper.findComponent({ name: "CommandPalette" });
    const commands = commandPalette.props("commands") as CommandDefinition[];
    const cmd = commands.find((c) => c.id === "view-collapse-left");
    expect(cmd).toBeDefined();
    expect(cmd?.placeholder).toBeUndefined();

    cmd?.run();
    await nextTick();

    expect(wrapper.find('[data-testid="left-panel-rail"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="tab-theme"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("再次执行 view-collapse-left 命令恢复展开态（命令 toggle 语义）", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    const commandPalette = wrapper.findComponent({ name: "CommandPalette" });
    const commands = commandPalette.props("commands") as CommandDefinition[];
    const cmd = commands.find((c) => c.id === "view-collapse-left");

    cmd?.run();
    await nextTick();
    expect(wrapper.find('[data-testid="left-panel-rail"]').exists()).toBe(true);

    cmd?.run();
    await nextTick();
    expect(wrapper.find('[data-testid="left-panel-rail"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="tab-theme"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("点击左栏 ⟨⟨ 收起按钮后，命令面板的 view-collapse-left 命令再次执行可恢复展开（按钮触发与命令触发状态一致）", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    await wrapper.find('[data-testid="collapse-btn"]').trigger("click");
    await nextTick();
    expect(wrapper.find('[data-testid="left-panel-rail"]').exists()).toBe(true);

    const commandPalette = wrapper.findComponent({ name: "CommandPalette" });
    const commands = commandPalette.props("commands") as CommandDefinition[];
    const cmd = commands.find((c) => c.id === "view-collapse-left");
    cmd?.run();
    await nextTick();

    expect(wrapper.find('[data-testid="left-panel-rail"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="tab-theme"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("点击 rail 图标（组件）恢复展开并激活「组件」Tab", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    await wrapper.find('[data-testid="collapse-btn"]').trigger("click");
    await nextTick();

    await wrapper.find('[data-testid="rail-icon-components"]').trigger("click");
    await nextTick();

    expect(wrapper.find('[data-testid="left-panel-rail"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="tab-components"]').classes()).toContain(
      "left-panel-tabs__tab--active"
    );
    wrapper.unmount();
  });
});

describe("AC-003: 左栏收纳状态经编辑器偏好存储持久化（设置→重建组件→状态恢复）", () => {
  it("点击收起按钮后持久化写入 IndexedDB，重建组件后恢复 rail 态", async () => {
    const wrapper1 = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();

    await wrapper1.find('[data-testid="collapse-btn"]').trigger("click");
    await nextTick();
    await nextTick();

    const persisted = await loadLeftPanelCollapsed();
    expect(persisted).toBe(true);

    wrapper1.unmount();

    setActivePinia(createPinia());
    const wrapper2 = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });

    await vi.waitFor(() => {
      expect(wrapper2.find('[data-testid="left-panel-rail"]').exists()).toBe(true);
    });
    expect(wrapper2.find('[data-testid="tab-theme"]').exists()).toBe(false);

    wrapper2.unmount();
  });

  it("未持久化过收纳状态时默认展开态", async () => {
    const wrapper = mount(EditorShell, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    await nextTick();

    expect(wrapper.find('[data-testid="left-panel-rail"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="tab-theme"]').exists()).toBe(true);

    wrapper.unmount();
  });
});

describe("同点收口: commandPaletteCommands 遗漏 downloadHtml dep", () => {
  it("命令面板触发 export-download-html 真实调用 composeExportHtml（与右键菜单路径行为一致）", async () => {
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

    const commandPalette = wrapper.findComponent({ name: "CommandPalette" });
    const commands = commandPalette.props("commands") as CommandDefinition[];
    const cmd = commands.find((c) => c.id === "export-download-html");
    expect(cmd).toBeDefined();
    expect(cmd?.placeholder).toBeUndefined();

    cmd?.run();
    await nextTick();
    await nextTick();

    expect(mockComposeExportHtml).toHaveBeenCalledOnce();

    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    wrapper.unmount();
  });
});
