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

async function mountWithContent(content: string) {
  const wrapper = mount(EditorShell, {
    attachTo: document.body,
    global: { plugins: [createPinia()] },
  });
  await nextTick();

  const sourcePane = wrapper.findComponent({ name: "SourcePane" });
  const onValueChange = sourcePane.props("onValueChange") as (value: string) => void;
  onValueChange(content);
  await nextTick();

  return wrapper;
}

describe("SR-006: StatusBar readMinutes 按正文字符数计算", () => {
  it("0 字 → readMinutes 为 1", async () => {
    const wrapper = await mountWithContent("");
    const statusBar = wrapper.findComponent({ name: "StatusBar" });
    const metrics = statusBar.props("metrics") as { readMinutes: number };
    expect(metrics.readMinutes).toBe(1);
    wrapper.unmount();
  });

  it("400 字 → readMinutes 为 1", async () => {
    const wrapper = await mountWithContent("字".repeat(400));
    const statusBar = wrapper.findComponent({ name: "StatusBar" });
    const metrics = statusBar.props("metrics") as { readMinutes: number };
    expect(metrics.readMinutes).toBe(1);
    wrapper.unmount();
  });

  it("2000 字 → readMinutes 为 5", async () => {
    const wrapper = await mountWithContent("字".repeat(2000));
    const statusBar = wrapper.findComponent({ name: "StatusBar" });
    const metrics = statusBar.props("metrics") as { readMinutes: number };
    expect(metrics.readMinutes).toBe(5);
    wrapper.unmount();
  });
});
