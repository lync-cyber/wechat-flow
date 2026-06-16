import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import ResizableSplitter from "../ResizableSplitter.vue";

function dispatchPointer(type: string, clientX: number): void {
  window.dispatchEvent(new MouseEvent(type, { clientX, bubbles: true, cancelable: true }));
}

const baseProps = { direction: "vertical" as const, minLeft: 160, maxLeft: 320, defaultLeft: 200 };

afterEach(() => {
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
});

describe("ResizableSplitter — 状态机（UC-002）", () => {
  it("idle 初始无 hover/dragging/disabled class", () => {
    const wrapper = mount(ResizableSplitter, { props: { ...baseProps, onResize: vi.fn() } });
    const el = wrapper.find('[data-testid="splitter"]');
    expect(el.classes()).not.toContain("splitter--hover");
    expect(el.classes()).not.toContain("splitter--dragging");
    expect(el.classes()).not.toContain("splitter--disabled");
  });

  it("mouseenter 进入 hover，mouseleave 回 idle", async () => {
    const wrapper = mount(ResizableSplitter, { props: { ...baseProps, onResize: vi.fn() } });
    const el = wrapper.find('[data-testid="splitter"]');
    await el.trigger("mouseenter");
    expect(el.classes()).toContain("splitter--hover");
    await el.trigger("mouseleave");
    expect(el.classes()).not.toContain("splitter--hover");
  });

  it("disabled=true 显示 disabled 态且 pointerdown 不触发拖拽", async () => {
    const onResize = vi.fn();
    const wrapper = mount(ResizableSplitter, { props: { ...baseProps, disabled: true, onResize } });
    const el = wrapper.find('[data-testid="splitter"]');
    expect(el.classes()).toContain("splitter--disabled");
    await el.trigger("pointerdown", { clientX: 100 });
    expect(el.classes()).not.toContain("splitter--dragging");
    dispatchPointer("pointermove", 150);
    expect(onResize).not.toHaveBeenCalled();
  });
});

describe("ResizableSplitter — 拖拽序列 + clamp（AC-002）", () => {
  it("pointerdown 进入 dragging 并锁定 body user-select / cursor", async () => {
    const wrapper = mount(ResizableSplitter, { props: { ...baseProps, onResize: vi.fn() } });
    const el = wrapper.find('[data-testid="splitter"]');
    await el.trigger("pointerdown", { clientX: 100 });
    expect(el.classes()).toContain("splitter--dragging");
    expect(document.body.style.userSelect).toBe("none");
    expect(document.body.style.cursor).toBe("col-resize");
    dispatchPointer("pointerup", 100);
  });

  it("拖拽范围内 onResize 收到新宽度", async () => {
    const onResize = vi.fn();
    const wrapper = mount(ResizableSplitter, { props: { ...baseProps, onResize } });
    await wrapper.find('[data-testid="splitter"]').trigger("pointerdown", { clientX: 100 });
    dispatchPointer("pointermove", 150);
    expect(onResize).toHaveBeenLastCalledWith(250);
    dispatchPointer("pointerup", 150);
  });

  it("拖拽超过 maxLeft 被 clamp 到 maxLeft", async () => {
    const onResize = vi.fn();
    const wrapper = mount(ResizableSplitter, { props: { ...baseProps, onResize } });
    await wrapper.find('[data-testid="splitter"]').trigger("pointerdown", { clientX: 100 });
    dispatchPointer("pointermove", 400);
    expect(onResize).toHaveBeenLastCalledWith(320);
    dispatchPointer("pointerup", 400);
  });

  it("拖拽低于 minLeft 被 clamp 到 minLeft", async () => {
    const onResize = vi.fn();
    const wrapper = mount(ResizableSplitter, { props: { ...baseProps, onResize } });
    await wrapper.find('[data-testid="splitter"]').trigger("pointerdown", { clientX: 100 });
    dispatchPointer("pointermove", 0);
    expect(onResize).toHaveBeenLastCalledWith(160);
    dispatchPointer("pointerup", 0);
  });

  it("invert=true（右侧面板）拖拽右移使宽度减小，方向与鼠标一致", async () => {
    const onResize = vi.fn();
    const wrapper = mount(ResizableSplitter, { props: { ...baseProps, invert: true, onResize } });
    await wrapper.find('[data-testid="splitter"]').trigger("pointerdown", { clientX: 100 });
    dispatchPointer("pointermove", 130); // 右移 +30 → invert: 200 - 30 = 170（减小，未触 clamp）
    expect(onResize).toHaveBeenLastCalledWith(170);
    dispatchPointer("pointerup", 130);
  });

  it("invert=true 拖拽左移使宽度增大", async () => {
    const onResize = vi.fn();
    const wrapper = mount(ResizableSplitter, { props: { ...baseProps, invert: true, onResize } });
    await wrapper.find('[data-testid="splitter"]').trigger("pointerdown", { clientX: 100 });
    dispatchPointer("pointermove", 60); // 左移 -40 → invert: 200 + 40 = 240
    expect(onResize).toHaveBeenLastCalledWith(240);
    dispatchPointer("pointerup", 60);
  });

  it("pointerup 结束拖拽，回 idle 且恢复 body 样式", async () => {
    const wrapper = mount(ResizableSplitter, { props: { ...baseProps, onResize: vi.fn() } });
    const el = wrapper.find('[data-testid="splitter"]');
    await el.trigger("pointerdown", { clientX: 100 });
    dispatchPointer("pointerup", 100);
    await nextTick();
    expect(el.classes()).not.toContain("splitter--dragging");
    expect(document.body.style.userSelect).toBe("");
    expect(document.body.style.cursor).toBe("");
  });
});
