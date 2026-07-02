import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

vi.mock("@wechat-flow/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@wechat-flow/core")>();
  return {
    ...actual,
    listDocuments: vi.fn().mockResolvedValue([
      { id: "doc-1", title: "文档一", updatedAt: 2000 },
      { id: "doc-2", title: "文档二", updatedAt: 1000 },
    ]),
  };
});

import DocumentListSheet from "../DocumentListSheet.vue";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("DocumentListSheet: 可见性", () => {
  it("open=false 时抽屉不可见（isVisible=false 或不存在）", async () => {
    const wrapper = mount(DocumentListSheet, {
      props: { open: false },
      attachTo: document.body,
    });
    await nextTick();
    const sheet = wrapper.find('[data-testid="document-list-sheet"]');
    if (sheet.exists()) {
      expect(sheet.isVisible()).toBe(false);
    } else {
      expect(sheet.exists()).toBe(false);
    }
    wrapper.unmount();
  });

  it("open=true 时抽屉可见（data-testid=document-list-sheet 存在且可见）", async () => {
    const wrapper = mount(DocumentListSheet, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    const sheet = wrapper.find('[data-testid="document-list-sheet"]');
    expect(sheet.exists()).toBe(true);
    expect(sheet.isVisible()).toBe(true);
    wrapper.unmount();
  });
});

describe("DocumentListSheet: 文档列表", () => {
  it("open=true 时渲染从 listDocuments 加载的文档列表项", async () => {
    const wrapper = mount(DocumentListSheet, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick(); // wait for async listDocuments
    const items = wrapper.findAll('[data-testid^="doc-item-"]');
    expect(items.length).toBeGreaterThanOrEqual(2);
    wrapper.unmount();
  });

  it("列表项显示文档标题", async () => {
    const wrapper = mount(DocumentListSheet, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();
    const text = wrapper.text();
    expect(text).toContain("文档一");
    expect(text).toContain("文档二");
    wrapper.unmount();
  });
});

describe("DocumentListSheet: 文档选择", () => {
  it("点击文档列表项 emit select-doc 并携带对应 docId", async () => {
    const wrapper = mount(DocumentListSheet, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();

    const item = wrapper.find('[data-testid="doc-item-doc-1"]');
    expect(item.exists()).toBe(true);
    await item.trigger("click");
    await nextTick();

    expect(wrapper.emitted("select-doc")).toBeTruthy();
    expect(wrapper.emitted("select-doc")?.[0]).toEqual(["doc-1"]);
    wrapper.unmount();
  });
});

describe("DocumentListSheet: 最大高度约束", () => {
  it("抽屉容器 max-height 包含 60vh", async () => {
    const wrapper = mount(DocumentListSheet, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    const sheet = wrapper.find('[data-testid="document-list-sheet"]');
    const style = sheet.attributes("style") ?? "";
    expect(style).toMatch(/max-height:\s*60vh/);
    wrapper.unmount();
  });
});

describe("DocumentListSheet: DEFECT-002 error 态", () => {
  it("listDocuments reject 时错误被就地处理，渲染「文档加载失败」+ 重试链接，不逃逸到 app 级 errorHandler", async () => {
    const { listDocuments } = await import("@wechat-flow/core");
    const listDocumentsMock = vi.mocked(listDocuments);
    listDocumentsMock.mockRejectedValueOnce(new Error("indexeddb unavailable"));

    const escapedError = vi.fn();
    const wrapper = mount(DocumentListSheet, {
      props: { open: true },
      attachTo: document.body,
      global: { config: { errorHandler: escapedError } },
    });
    await nextTick();
    await nextTick();
    await nextTick();

    expect(escapedError).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain("还没有文档");
    expect(wrapper.text()).toContain("文档加载失败");

    const retryLink = wrapper.find('[data-testid="doc-list-retry"]');
    expect(retryLink.exists()).toBe(true);
    expect(retryLink.text()).toContain("重试");
    wrapper.unmount();
  });

  it("点击重试且 resolve 非空列表后渲染文档列表项", async () => {
    const { listDocuments } = await import("@wechat-flow/core");
    const listDocumentsMock = vi.mocked(listDocuments);
    listDocumentsMock.mockRejectedValueOnce(new Error("indexeddb unavailable"));

    const wrapper = mount(DocumentListSheet, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();
    await nextTick();

    expect(wrapper.text()).toContain("文档加载失败");

    listDocumentsMock.mockResolvedValueOnce([
      { id: "doc-1", title: "文档一", updatedAt: 2000, size: 100 },
    ]);

    const retryLink = wrapper.find('[data-testid="doc-list-retry"]');
    await retryLink.trigger("click");
    await nextTick();
    await nextTick();
    await nextTick();

    expect(wrapper.text()).not.toContain("文档加载失败");
    const item1 = wrapper.find('[data-testid="doc-item-doc-1"]');
    expect(item1.exists()).toBe(true);
    expect(item1.text()).toContain("文档一");
    wrapper.unmount();
  });
});
