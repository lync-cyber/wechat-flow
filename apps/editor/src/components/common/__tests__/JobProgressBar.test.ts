import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import JobProgressBar from "../JobProgressBar.vue";

// AC-001: running 状态 + progress 45 → 进度填充宽度 45%，文字「正在导出 45%」
describe("AC-001: running 状态进度填充与文案", () => {
  it("status=running percent=45 → fill width 为 45%", async () => {
    const wrapper = mount(JobProgressBar, {
      props: { status: "running", percent: 45 },
    });
    await nextTick();

    const fill = wrapper.find('[data-testid="progress-fill"]');
    expect(fill.attributes("style")).toContain("width: 45%");
    wrapper.unmount();
  });

  it("status=running percent=45 → 文字显示「正在导出 45%」", async () => {
    const wrapper = mount(JobProgressBar, {
      props: { status: "running", percent: 45 },
    });
    await nextTick();

    const label = wrapper.find('[data-testid="progress-label"]');
    expect(label.text()).toContain("正在导出 45%");
    wrapper.unmount();
  });
});

// AC-002: completed 状态 → fill 用 --color-success class，文字「导出成功」，含下载链接
describe("AC-002: completed 状态填充色与下载链接", () => {
  it("status=completed → fill class 含 job-progress-bar__fill--completed（--color-success token）", async () => {
    const wrapper = mount(JobProgressBar, {
      props: { status: "completed", percent: 100, downloadUrl: "https://cdn.example.com/img.png" },
    });
    await nextTick();

    const fill = wrapper.find('[data-testid="progress-fill"]');
    expect(fill.classes()).toContain("job-progress-bar__fill--completed");
    wrapper.unmount();
  });

  it("status=completed → 文字显示「导出成功」", async () => {
    const wrapper = mount(JobProgressBar, {
      props: { status: "completed", percent: 100, downloadUrl: "https://cdn.example.com/img.png" },
    });
    await nextTick();

    const label = wrapper.find('[data-testid="progress-label"]');
    expect(label.text()).toContain("导出成功");
    wrapper.unmount();
  });

  it("status=completed 且有 downloadUrl → 下载链接存在且 href 正确", async () => {
    const wrapper = mount(JobProgressBar, {
      props: { status: "completed", percent: 100, downloadUrl: "https://cdn.example.com/img.png" },
    });
    await nextTick();

    const link = wrapper.find('[data-testid="download-link"]');
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe("https://cdn.example.com/img.png");
    wrapper.unmount();
  });

  it("status=completed 但无 downloadUrl → 下载链接不渲染", async () => {
    const wrapper = mount(JobProgressBar, {
      props: { status: "completed", percent: 100 },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="download-link"]').exists()).toBe(false);
    wrapper.unmount();
  });
});

// queued 状态
describe("queued 状态", () => {
  it("status=queued → 文字显示「等待中…」", async () => {
    const wrapper = mount(JobProgressBar, {
      props: { status: "queued" },
    });
    await nextTick();

    const label = wrapper.find('[data-testid="progress-label"]');
    expect(label.text()).toContain("等待中…");
    wrapper.unmount();
  });

  it("status=queued → fill width 为 0%", async () => {
    const wrapper = mount(JobProgressBar, {
      props: { status: "queued" },
    });
    await nextTick();

    const fill = wrapper.find('[data-testid="progress-fill"]');
    expect(fill.attributes("style")).toContain("width: 0%");
    wrapper.unmount();
  });
});

// failed 状态
describe("failed 状态", () => {
  it("status=failed → fill class 含 job-progress-bar__fill--failed（--color-error token）", async () => {
    const wrapper = mount(JobProgressBar, {
      props: { status: "failed", errorMsg: "网络超时" },
    });
    await nextTick();

    const fill = wrapper.find('[data-testid="progress-fill"]');
    expect(fill.classes()).toContain("job-progress-bar__fill--failed");
    wrapper.unmount();
  });

  it("status=failed → 文字显示「导出失败：网络超时」", async () => {
    const wrapper = mount(JobProgressBar, {
      props: { status: "failed", errorMsg: "网络超时" },
    });
    await nextTick();

    const label = wrapper.find('[data-testid="progress-label"]');
    expect(label.text()).toContain("导出失败：网络超时");
    wrapper.unmount();
  });

  it("status=failed 且有 onRetry → 重试按钮存在，点击触发 onRetry", async () => {
    const onRetry = vi.fn();
    const wrapper = mount(JobProgressBar, {
      props: { status: "failed", errorMsg: "失败", onRetry },
    });
    await nextTick();

    const btn = wrapper.find('[data-testid="retry-btn"]');
    expect(btn.exists()).toBe(true);
    await btn.trigger("click");
    expect(onRetry).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});
