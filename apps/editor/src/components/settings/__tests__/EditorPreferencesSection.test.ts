import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

const { saveEditorPreferences, loadEditorPreferences } = vi.hoisted(() => ({
  saveEditorPreferences: vi.fn().mockResolvedValue(undefined),
  loadEditorPreferences: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@wechat-flow/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@wechat-flow/core")>();
  return {
    ...actual,
    saveEditorPreferences,
    loadEditorPreferences,
  };
});

import { usePreferencesStore } from "../../../stores/preferences-store.ts";
import EditorPreferencesSection from "../EditorPreferencesSection.vue";

beforeEach(() => {
  setActivePinia(createPinia());
  saveEditorPreferences.mockClear();
  loadEditorPreferences.mockClear();
  loadEditorPreferences.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AC-001: 「编辑器偏好」分组含 3 控件", () => {
  it("渲染输入辅助 toggle", async () => {
    const wrapper = mount(EditorPreferencesSection);
    await nextTick();
    const el = wrapper.find("[data-testid='pref-input-assist']");
    expect(el.exists()).toBe(true);
    expect(el.attributes("type")).toBe("checkbox");
  });

  it("渲染字体大小选择器，含 14/16/18 三档", async () => {
    const wrapper = mount(EditorPreferencesSection);
    await nextTick();
    const el = wrapper.find("[data-testid='pref-font-size']");
    expect(el.exists()).toBe(true);
    const values = el.findAll("option").map((o) => o.attributes("value"));
    expect(values).toEqual(["14", "16", "18"]);
  });

  it("渲染行高选择器，含紧凑/标准/宽松三档", async () => {
    const wrapper = mount(EditorPreferencesSection);
    await nextTick();
    const el = wrapper.find("[data-testid='pref-line-height']");
    expect(el.exists()).toBe(true);
    const options = el.findAll("option");
    expect(options.map((o) => o.attributes("value"))).toEqual(["1.5", "1.75", "2"]);
    expect(options.map((o) => o.text())).toEqual(["紧凑", "标准", "宽松"]);
  });

  it("标题为「编辑器偏好」", async () => {
    const wrapper = mount(EditorPreferencesSection);
    await nextTick();
    expect(wrapper.text()).toContain("编辑器偏好");
  });
});

describe("AC-002: inputAssist toggle 初始状态反映 store 默认值（false）", () => {
  it("挂载时 checkbox 未选中", async () => {
    const wrapper = mount(EditorPreferencesSection);
    await nextTick();
    const el = wrapper.find("[data-testid='pref-input-assist']");
    expect((el.element as HTMLInputElement).checked).toBe(false);
  });
});

describe("AC-003: 控件变更经 updatePreferences 持久化", () => {
  it("勾选输入辅助 toggle 触发 updatePreferences({ inputAssist: true })", async () => {
    const wrapper = mount(EditorPreferencesSection);
    await nextTick();
    const store = usePreferencesStore();
    const spy = vi.spyOn(store, "updatePreferences");

    const el = wrapper.find("[data-testid='pref-input-assist']");
    await el.setValue(true);

    expect(spy).toHaveBeenCalledWith({ inputAssist: true });
  });

  it("选择字体大小 18 触发 updatePreferences({ fontSize: 18 })", async () => {
    const wrapper = mount(EditorPreferencesSection);
    await nextTick();
    const store = usePreferencesStore();
    const spy = vi.spyOn(store, "updatePreferences");

    const el = wrapper.find("[data-testid='pref-font-size']");
    await el.setValue("18");

    expect(spy).toHaveBeenCalledWith({ fontSize: 18 });
  });

  it("选择行高「宽松」触发 updatePreferences({ lineHeight: 2 })", async () => {
    const wrapper = mount(EditorPreferencesSection);
    await nextTick();
    const store = usePreferencesStore();
    const spy = vi.spyOn(store, "updatePreferences");

    const el = wrapper.find("[data-testid='pref-line-height']");
    await el.setValue("2");

    expect(spy).toHaveBeenCalledWith({ lineHeight: 2 });
  });
});

describe("挂载时调用 store.init() 从持久化恢复偏好", () => {
  it("挂载后 loadEditorPreferences 被调用", async () => {
    mount(EditorPreferencesSection);
    await nextTick();
    expect(loadEditorPreferences).toHaveBeenCalled();
  });

  it("有保存值时挂载后字体大小选择器反映该值", async () => {
    loadEditorPreferences.mockResolvedValueOnce({
      inputAssist: true,
      fontSize: 18,
      lineHeight: 2,
    });
    const wrapper = mount(EditorPreferencesSection);
    await nextTick();
    await nextTick();
    const el = wrapper.find("[data-testid='pref-font-size']");
    expect((el.element as HTMLSelectElement).value).toBe("18");
  });
});
