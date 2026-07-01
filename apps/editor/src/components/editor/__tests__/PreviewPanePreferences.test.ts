import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import PreviewPane from "../PreviewPane.vue";

const defaultProps = {
  htmlContent: "<p>Hello</p>",
  viewport: "375" as const,
  nightMode: "off" as const,
  isLoading: false,
  syncState: "idle" as const,
  onViewportChange: () => {},
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AC-005: lineHeight prop 实时作用于 --preview-line-height CSS 变量", () => {
  it("默认未传 lineHeight 时根元素 style 含 --preview-line-height: 1.75", async () => {
    const wrapper = mount(PreviewPane, { props: defaultProps, attachTo: document.body });
    await nextTick();
    const root = wrapper.find('[data-testid="preview-pane"]');
    expect(root.attributes("style")).toContain("--preview-line-height: 1.75");
    wrapper.unmount();
  });

  it("传 :line-height=2 后根元素 style 含 --preview-line-height: 2", async () => {
    const wrapper = mount(PreviewPane, {
      props: { ...defaultProps, lineHeight: 2 },
      attachTo: document.body,
    });
    await nextTick();
    const root = wrapper.find('[data-testid="preview-pane"]');
    expect(root.attributes("style")).toContain("--preview-line-height: 2");
    wrapper.unmount();
  });

  it("传 :line-height=1.5 后根元素 style 含 --preview-line-height: 1.5", async () => {
    const wrapper = mount(PreviewPane, {
      props: { ...defaultProps, lineHeight: 1.5 },
      attachTo: document.body,
    });
    await nextTick();
    const root = wrapper.find('[data-testid="preview-pane"]');
    expect(root.attributes("style")).toContain("--preview-line-height: 1.5");
    wrapper.unmount();
  });
});
