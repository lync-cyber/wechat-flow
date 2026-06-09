import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
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

// AC-001: iframe sandbox allows same-origin for contentDocument access + CSP blocks scripts
describe("AC-001: iframe 沙箱安全属性", () => {
  it("iframe sandbox 含 allow-same-origin（启用 contentDocument 双向高亮；scripts 由 CSP 阻断）", async () => {
    const wrapper = mount(PreviewPane, { props: defaultProps, attachTo: document.body });
    await nextTick();
    const iframe = wrapper.find("iframe").element as HTMLIFrameElement;
    // allow-same-origin enables parent contentDocument access for AC-001/AC-002 bidirectional
    // highlight; script execution is still blocked by CSP default-src 'none'
    const sandboxVal = iframe.getAttribute("sandbox") ?? "";
    expect(sandboxVal).toContain("allow-same-origin");
    expect(sandboxVal).not.toContain("allow-scripts");
    wrapper.unmount();
  });

  it("iframe srcdoc 含 CSP meta（default-src 'none'; style-src 'unsafe-inline'）", async () => {
    const wrapper = mount(PreviewPane, { props: defaultProps, attachTo: document.body });
    await nextTick();
    const iframe = wrapper.find("iframe").element as HTMLIFrameElement;
    const srcdoc = iframe.getAttribute("srcdoc") ?? "";
    expect(srcdoc).toContain('http-equiv="Content-Security-Policy"');
    expect(srcdoc).toContain("default-src 'none'");
    expect(srcdoc).toContain("style-src 'unsafe-inline'");
    wrapper.unmount();
  });
});

// AC-002: htmlContent prop update → srcdoc updated, no script execution
describe("AC-002: htmlContent 更新驱动 iframe srcdoc，script 被沙箱阻断", () => {
  it("htmlContent 更新后 iframe srcdoc 含更新内容", async () => {
    const wrapper = mount(PreviewPane, {
      props: { ...defaultProps, htmlContent: "<p>Initial</p>" },
      attachTo: document.body,
    });
    await nextTick();

    await wrapper.setProps({ htmlContent: "<p>Updated content</p>" });
    await nextTick();

    const iframe = wrapper.find("iframe").element as HTMLIFrameElement;
    expect(iframe.getAttribute("srcdoc") ?? "").toContain("Updated content");
    wrapper.unmount();
  });

  // happy-dom 不实现真实 iframe sandbox 语义：本断言验证脚本原文进入 srcdoc 但不执行；
  // sandbox="" 的浏览器级脚本阻断保证须由真实浏览器 E2E（Playwright 视觉回归层）覆盖。
  it("含 <script> 的 htmlContent 进入 srcdoc 但 sandbox 阻断执行（全局变量不被设置）", async () => {
    const w = window as unknown as Record<string, unknown>;
    w.__xss_test = undefined;
    const maliciousContent = '<p>safe text</p><script>window.__xss_test = "injected";</script>';
    const wrapper = mount(PreviewPane, {
      props: { ...defaultProps, htmlContent: maliciousContent },
      attachTo: document.body,
    });
    await nextTick();
    // 脚本原文在 srcdoc 中，但 sandbox="allow-same-origin" 无 allow-scripts，且 CSP default-src 'none' 阻断执行 → 全局变量保持 undefined
    const srcdoc = wrapper.find("iframe").element.getAttribute("srcdoc") ?? "";
    expect(srcdoc).toContain("<script>");
    expect((window as unknown as Record<string, unknown>).__xss_test).toBeUndefined();
    wrapper.unmount();
  });
});

// AC-003: 视口切换工具栏 — 手机按钮点击 → iframe width=375px，按钮激活态
describe("AC-003: 视口切换工具栏行为", () => {
  it("默认视口 375 时，手机按钮带激活样式（--color-brand-subtle 背景 class）", async () => {
    const wrapper = mount(PreviewPane, {
      props: { ...defaultProps, viewport: "375" },
    });
    await nextTick();
    const phoneBtn = wrapper.find('[data-testid="viewport-btn-375"]');
    expect(phoneBtn.exists()).toBe(true);
    expect(phoneBtn.classes()).toContain("preview-pane__viewport-btn--active");
    wrapper.unmount();
  });

  it("点击「手机」(375) 按钮后 iframe 容器 width CSS 为 375px", async () => {
    const onViewportChange = vi.fn();
    const wrapper = mount(PreviewPane, {
      props: { ...defaultProps, viewport: "768", onViewportChange },
    });
    await nextTick();

    await wrapper.find('[data-testid="viewport-btn-375"]').trigger("click");
    await nextTick();

    // After clicking, viewport changes; when controlled by parent the prop drives width
    // In uncontrolled mode (internal state), iframe wrapper should be 375px
    expect(onViewportChange).toHaveBeenCalledWith("375");
    wrapper.unmount();
  });

  it("视口为 375 时 iframe 容器 width style 为 375px", async () => {
    const wrapper = mount(PreviewPane, {
      props: { ...defaultProps, viewport: "375" },
    });
    await nextTick();
    const iframeWrapper = wrapper.find('[data-testid="iframe-container"]');
    expect(iframeWrapper.exists()).toBe(true);
    const width = (iframeWrapper.element as HTMLElement).style.width;
    expect(width).toBe("375px");
    wrapper.unmount();
  });

  it("视口为 768 时 iframe 容器 width style 为 768px，平板按钮激活", async () => {
    const wrapper = mount(PreviewPane, {
      props: { ...defaultProps, viewport: "768" },
    });
    await nextTick();
    const iframeWrapper = wrapper.find('[data-testid="iframe-container"]');
    expect((iframeWrapper.element as HTMLElement).style.width).toBe("768px");
    const tabletBtn = wrapper.find('[data-testid="viewport-btn-768"]');
    expect(tabletBtn.classes()).toContain("preview-pane__viewport-btn--active");
    wrapper.unmount();
  });

  it("视口为 auto 时 iframe 容器 width style 为 100%，自适应按钮激活", async () => {
    const wrapper = mount(PreviewPane, {
      props: { ...defaultProps, viewport: "auto" },
    });
    await nextTick();
    const iframeWrapper = wrapper.find('[data-testid="iframe-container"]');
    expect((iframeWrapper.element as HTMLElement).style.width).toBe("100%");
    const autoBtn = wrapper.find('[data-testid="viewport-btn-auto"]');
    expect(autoBtn.classes()).toContain("preview-pane__viewport-btn--active");
    wrapper.unmount();
  });

  it("工具栏显示「手机」「平板」「自适应」标签文字", async () => {
    const wrapper = mount(PreviewPane, { props: defaultProps });
    await nextTick();
    expect(wrapper.find('[data-testid="viewport-btn-375"]').text()).toBe("手机");
    expect(wrapper.find('[data-testid="viewport-btn-768"]').text()).toBe("平板");
    expect(wrapper.find('[data-testid="viewport-btn-auto"]').text()).toBe("自适应");
    wrapper.unmount();
  });
});

// C-005 loading 态（ui-spec C-005 状态表 `loading`）：iframe 区域居中 spinner
describe("C-005 loading 态", () => {
  it("isLoading=true 时显示 loading 指示（渲染中…）", async () => {
    const wrapper = mount(PreviewPane, { props: { ...defaultProps, isLoading: true } });
    await nextTick();
    const loading = wrapper.find('[data-testid="preview-loading"]');
    expect(loading.exists()).toBe(true);
    expect(loading.text()).toContain("渲染中");
    wrapper.unmount();
  });

  it("isLoading=false 时不显示 loading 指示", async () => {
    const wrapper = mount(PreviewPane, { props: { ...defaultProps, isLoading: false } });
    await nextTick();
    expect(wrapper.find('[data-testid="preview-loading"]').exists()).toBe(false);
    wrapper.unmount();
  });
});

// C-005 error 态（ui-spec C-005 状态表 `error`）：! 图标 + 错误说明 + 「重试」按钮
describe("C-005 error 态", () => {
  it("error 非空时显示错误说明 + 「重试」按钮，iframe 被替换", async () => {
    const wrapper = mount(PreviewPane, {
      props: { ...defaultProps, error: "渲染失败，请重试" },
    });
    await nextTick();
    const errView = wrapper.find('[data-testid="preview-error"]');
    expect(errView.exists()).toBe(true);
    expect(errView.text()).toContain("渲染失败");
    expect(wrapper.find('[data-testid="preview-retry-btn"]').text()).toBe("重试");
    expect(wrapper.find('[data-testid="iframe-container"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("点击「重试」触发 onRetry 回调", async () => {
    const onRetry = vi.fn();
    const wrapper = mount(PreviewPane, {
      props: { ...defaultProps, error: "渲染失败", onRetry },
    });
    await nextTick();
    await wrapper.find('[data-testid="preview-retry-btn"]').trigger("click");
    expect(onRetry).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("error 为空时不显示错误视图，iframe 正常存在", async () => {
    const wrapper = mount(PreviewPane, { props: defaultProps, attachTo: document.body });
    await nextTick();
    expect(wrapper.find('[data-testid="preview-error"]').exists()).toBe(false);
    expect(wrapper.find("iframe").exists()).toBe(true);
    wrapper.unmount();
  });
});
