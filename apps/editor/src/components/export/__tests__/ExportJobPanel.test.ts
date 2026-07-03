import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import ExportJobPanel from "../ExportJobPanel.vue";

vi.mock("../../../composables/use-toast.ts", () => ({
  useToast: () => ({ pushToast: vi.fn(), toasts: ref([]), dismissToast: vi.fn() }),
}));

function makeJob(
  overrides: Partial<{
    status: "queued" | "running" | "completed" | "failed";
    percent: number;
    result: unknown;
    error: { code: string; message: string } | undefined;
  }> = {}
) {
  return {
    status: ref(overrides.status ?? "queued"),
    percent: ref(overrides.percent ?? 0),
    result: ref(overrides.result),
    error: ref(overrides.error),
  };
}

describe("AC-001: 面板可见性", () => {
  it("isOpen=false 时不渲染面板", async () => {
    const wrapper = mount(ExportJobPanel, {
      props: { isOpen: false, job: makeJob() },
    });
    await nextTick();
    expect(wrapper.find('[data-testid="export-job-panel"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("isOpen=true 时渲染面板并含 JobProgressBar", async () => {
    const wrapper = mount(ExportJobPanel, {
      props: { isOpen: true, job: makeJob({ status: "running", percent: 30 }) },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="export-job-panel"]').exists()).toBe(true);
    const bar = wrapper.findComponent({ name: "JobProgressBar" });
    expect(bar.exists()).toBe(true);
    expect(bar.props("status")).toBe("running");
    expect(bar.props("percent")).toBe(30);
    wrapper.unmount();
  });
});

describe("AC-002: succeeded 展示结果链接", () => {
  it("status=completed 且 result.url 存在 → JobProgressBar 收到 downloadUrl", async () => {
    const wrapper = mount(ExportJobPanel, {
      props: {
        isOpen: true,
        job: makeJob({
          status: "completed",
          percent: 100,
          result: { url: "https://cdn.example.com/long.png" },
        }),
      },
    });
    await nextTick();

    const bar = wrapper.findComponent({ name: "JobProgressBar" });
    expect(bar.props("downloadUrl")).toBe("https://cdn.example.com/long.png");
    wrapper.unmount();
  });
});

describe("AC-003: 面板可关闭", () => {
  it("任务进行中（running）不显示关闭按钮", async () => {
    const wrapper = mount(ExportJobPanel, {
      props: { isOpen: true, job: makeJob({ status: "running", percent: 10 }) },
    });
    await nextTick();
    expect(wrapper.find('[data-testid="export-job-panel-close"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("任务结束（completed）显示关闭按钮，点击触发 close 事件", async () => {
    const wrapper = mount(ExportJobPanel, {
      props: {
        isOpen: true,
        job: makeJob({
          status: "completed",
          percent: 100,
          result: { url: "https://cdn.example.com/x.png" },
        }),
      },
    });
    await nextTick();

    const closeBtn = wrapper.find('[data-testid="export-job-panel-close"]');
    expect(closeBtn.exists()).toBe(true);
    await closeBtn.trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
    wrapper.unmount();
  });

  it("任务失败（failed）显示关闭按钮", async () => {
    const wrapper = mount(ExportJobPanel, {
      props: {
        isOpen: true,
        job: makeJob({ status: "failed", error: { code: "E_TIMEOUT", message: "超时" } }),
      },
    });
    await nextTick();
    expect(wrapper.find('[data-testid="export-job-panel-close"]').exists()).toBe(true);
    wrapper.unmount();
  });
});
