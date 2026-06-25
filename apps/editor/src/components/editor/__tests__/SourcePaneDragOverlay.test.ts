import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import SourcePane from "../SourcePane.vue";

afterEach(() => {
  vi.restoreAllMocks();
});

function makeDragEvent(type: string, includeFiles = true): DragEvent {
  const ev = new DragEvent(type, { bubbles: true, cancelable: true });
  // biome-ignore lint/suspicious/noExplicitAny: test DataTransfer stub
  const dt: any = includeFiles ? { types: ["Files"], files: [] } : { types: [], files: [] };
  Object.defineProperty(ev, "dataTransfer", { value: dt, writable: false });
  return ev;
}

describe("AC-R2-004-a: dragenter → ImageUploadOverlay dragging 态可见", () => {
  it("dragenter 含 Files → showOverlay=true，ImageUploadOverlay 以 dragging 态渲染", async () => {
    const wrapper = mount(SourcePane, {
      props: { modelValue: "" },
      attachTo: document.body,
    });
    await nextTick();

    const pane = wrapper.find('[data-testid="source-pane"]');
    pane.element.dispatchEvent(makeDragEvent("dragenter"));
    await nextTick();

    const overlay = wrapper.find('[data-testid="image-upload-overlay"]');
    expect(overlay.exists()).toBe(true);

    const draggingEl = wrapper.find('[data-testid="overlay-dragging"]');
    expect(draggingEl.exists()).toBe(true);

    wrapper.unmount();
  });

  it("dragenter 不含 Files → ImageUploadOverlay 不渲染", async () => {
    const wrapper = mount(SourcePane, {
      props: { modelValue: "" },
      attachTo: document.body,
    });
    await nextTick();

    const pane = wrapper.find('[data-testid="source-pane"]');
    pane.element.dispatchEvent(makeDragEvent("dragenter", false));
    await nextTick();

    expect(wrapper.find('[data-testid="image-upload-overlay"]').exists()).toBe(false);

    wrapper.unmount();
  });
});

describe("AC-R2-004-b: dragleave 回 idle → 浮层隐藏，无残留", () => {
  it("dragenter 后 dragleave → state 回 idle，ImageUploadOverlay 隐藏", async () => {
    const wrapper = mount(SourcePane, {
      props: { modelValue: "" },
      attachTo: document.body,
    });
    await nextTick();

    const pane = wrapper.find('[data-testid="source-pane"]');

    pane.element.dispatchEvent(makeDragEvent("dragenter"));
    await nextTick();

    expect(wrapper.find('[data-testid="overlay-dragging"]').exists()).toBe(true);

    // dragleave from outside pane (relatedTarget=null means cursor left pane entirely)
    const leaveEv = new DragEvent("dragleave", {
      bubbles: true,
      cancelable: true,
      relatedTarget: null,
    });
    Object.defineProperty(leaveEv, "dataTransfer", {
      value: { types: ["Files"] },
      writable: false,
    });
    pane.element.dispatchEvent(leaveEv);
    await nextTick();

    expect(wrapper.find('[data-testid="image-upload-overlay"]').exists()).toBe(false);

    wrapper.unmount();
  });

  it("dragenter 后 drop（未上传） → dragleave 路径清理，不留 dragging 态", async () => {
    const wrapper = mount(SourcePane, {
      props: { modelValue: "" },
      attachTo: document.body,
    });
    await nextTick();

    const pane = wrapper.find('[data-testid="source-pane"]');

    pane.element.dispatchEvent(makeDragEvent("dragenter"));
    await nextTick();

    // drop with no image files — endDrag called, showOverlay should be false
    const dropEv = new DragEvent("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(dropEv, "dataTransfer", {
      value: { types: [], files: [] as unknown as FileList },
      writable: false,
    });
    pane.element.dispatchEvent(dropEv);
    await nextTick();

    expect(wrapper.find('[data-testid="overlay-dragging"]').exists()).toBe(false);

    wrapper.unmount();
  });
});
