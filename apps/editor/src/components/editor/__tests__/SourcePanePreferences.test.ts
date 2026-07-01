import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import SourcePane from "../SourcePane.vue";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("AC-004: fontSize prop 实时作用于 --editor-font-size CSS 变量", () => {
  it("默认未传 fontSize 时根元素 style 含 --editor-font-size: 16px", async () => {
    const wrapper = mount(SourcePane, { attachTo: document.body });
    await nextTick();
    const root = wrapper.find('[data-testid="source-pane"]');
    expect(root.attributes("style")).toContain("--editor-font-size: 16px");
    wrapper.unmount();
  });

  it("传 :font-size=18 后根元素 style 含 --editor-font-size: 18px", async () => {
    const wrapper = mount(SourcePane, {
      props: { fontSize: 18 },
      attachTo: document.body,
    });
    await nextTick();
    const root = wrapper.find('[data-testid="source-pane"]');
    expect(root.attributes("style")).toContain("--editor-font-size: 18px");
    wrapper.unmount();
  });

  it("传 :font-size=14 后根元素 style 含 --editor-font-size: 14px", async () => {
    const wrapper = mount(SourcePane, {
      props: { fontSize: 14 },
      attachTo: document.body,
    });
    await nextTick();
    const root = wrapper.find('[data-testid="source-pane"]');
    expect(root.attributes("style")).toContain("--editor-font-size: 14px");
    wrapper.unmount();
  });
});

describe("inputAssist prop 接线进 inputRulesExtension（T-067 seam）", () => {
  it("inputAssist=true 时单字符中英文交界输入触发自动空格规则", async () => {
    const wrapper = mount(SourcePane, {
      props: { modelValue: "中文", inputAssist: true },
      attachTo: document.body,
    });
    await nextTick();

    const view = (wrapper.vm as unknown as { editorView: import("@codemirror/view").EditorView })
      .editorView;
    expect(view).toBeTruthy();

    view.dispatch({
      changes: { from: 2, to: 2, insert: "A" },
      selection: { anchor: 3 },
      userEvent: "input.type",
    });
    await nextTick();

    expect(view.state.doc.toString()).toBe("中文 A");
    wrapper.unmount();
  });

  it("inputAssist=false（默认）时不触发自动空格规则", async () => {
    const wrapper = mount(SourcePane, {
      props: { modelValue: "中文" },
      attachTo: document.body,
    });
    await nextTick();

    const view = (wrapper.vm as unknown as { editorView: import("@codemirror/view").EditorView })
      .editorView;
    expect(view).toBeTruthy();

    view.dispatch({
      changes: { from: 2, to: 2, insert: "A" },
      selection: { anchor: 3 },
      userEvent: "input.type",
    });
    await nextTick();

    expect(view.state.doc.toString()).toBe("中文A");
    wrapper.unmount();
  });
});
