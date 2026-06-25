import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import ImageUploadOverlay from "../ImageUploadOverlay.vue";

const baseProps = {
  state: "idle" as const,
  onRetry: vi.fn(),
  onCancel: vi.fn(),
};

describe("UC-018 idle 状态", () => {
  it("state=idle → 渲染拖入提示文字", async () => {
    const wrapper = mount(ImageUploadOverlay, { props: { ...baseProps, state: "idle" } });
    await nextTick();
    expect(wrapper.find('[data-testid="overlay-idle"]').exists()).toBe(true);
    wrapper.unmount();
  });
});

describe("UC-018 dragging 状态", () => {
  it("state=dragging → 渲染「松开以上传」区域", async () => {
    const wrapper = mount(ImageUploadOverlay, { props: { ...baseProps, state: "dragging" } });
    await nextTick();
    expect(wrapper.find('[data-testid="overlay-dragging"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("state=dragging → 根元素含 overlay--dragging class（品牌边框色）", async () => {
    const wrapper = mount(ImageUploadOverlay, { props: { ...baseProps, state: "dragging" } });
    await nextTick();
    expect(wrapper.find('[data-testid="image-upload-overlay"]').classes()).toContain(
      "image-upload-overlay--dragging"
    );
    wrapper.unmount();
  });
});

describe("UC-018 uploading 状态", () => {
  it("state=uploading → 渲染进度区域（含 job-progress-bar）", async () => {
    const wrapper = mount(ImageUploadOverlay, {
      props: { ...baseProps, state: "uploading", progress: 42 },
    });
    await nextTick();
    expect(wrapper.find('[data-testid="overlay-uploading"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="job-progress-bar"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("state=uploading progress=42 → 进度数字 42 出现在文本中", async () => {
    const wrapper = mount(ImageUploadOverlay, {
      props: { ...baseProps, state: "uploading", progress: 42 },
    });
    await nextTick();
    expect(wrapper.text()).toContain("42");
    wrapper.unmount();
  });
});

describe("UC-018 success 状态", () => {
  it("state=success → 渲染「上传成功」区域", async () => {
    const wrapper = mount(ImageUploadOverlay, { props: { ...baseProps, state: "success" } });
    await nextTick();
    expect(wrapper.find('[data-testid="overlay-success"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("state=success → 文字含「上传成功」", async () => {
    const wrapper = mount(ImageUploadOverlay, { props: { ...baseProps, state: "success" } });
    await nextTick();
    expect(wrapper.text()).toContain("上传成功");
    wrapper.unmount();
  });
});

describe("UC-018 error 状态 + 重试/取消", () => {
  it("state=error → 渲染错误区域与错误信息", async () => {
    const wrapper = mount(ImageUploadOverlay, {
      props: { ...baseProps, state: "error", errorMsg: "文件过大" },
    });
    await nextTick();
    expect(wrapper.find('[data-testid="overlay-error"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("文件过大");
    wrapper.unmount();
  });

  it("state=error → 点击「重试」触发 onRetry prop", async () => {
    const onRetry = vi.fn();
    const wrapper = mount(ImageUploadOverlay, {
      props: { ...baseProps, state: "error", errorMsg: "失败", onRetry },
    });
    await nextTick();
    await wrapper.find('[data-testid="retry-btn"]').trigger("click");
    expect(onRetry).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("state=error → 点击「取消」触发 onCancel prop", async () => {
    const onCancel = vi.fn();
    const wrapper = mount(ImageUploadOverlay, {
      props: { ...baseProps, state: "error", errorMsg: "失败", onCancel },
    });
    await nextTick();
    await wrapper.find('[data-testid="cancel-btn"]').trigger("click");
    expect(onCancel).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});
