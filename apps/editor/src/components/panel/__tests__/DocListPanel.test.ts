import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { useEditorStore } from "../../../stores/editor.ts";

vi.mock("@wechat-flow/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@wechat-flow/core")>();
  return { ...actual, listDocuments: vi.fn() };
});

const mockRouterPush = vi.fn();
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

import { listDocuments } from "@wechat-flow/core";
import DocListPanel from "../DocListPanel.vue";

const listDocumentsMock = vi.mocked(listDocuments);

beforeEach(() => {
  setActivePinia(createPinia());
  mockRouterPush.mockClear();
  listDocumentsMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AC-001: 新建按钮跳转主题模板市场", () => {
  it("渲染「+ 新建」全宽按钮，点击后导航到 /themes", async () => {
    listDocumentsMock.mockResolvedValue([]);
    const wrapper = mount(DocListPanel, {
      attachTo: document.body,
    });
    await nextTick();

    const newBtn = wrapper.find('[data-testid="doc-list-new"]');
    expect(newBtn.exists()).toBe(true);

    await newBtn.trigger("click");
    await nextTick();

    expect(mockRouterPush).toHaveBeenCalledWith("/themes");
    wrapper.unmount();
  });
});

describe("AC-002: populated 列表渲染文档项", () => {
  it("resolve N 条文档时渲染 N 个列表项，含标题与最后修改时间副标题", async () => {
    listDocumentsMock.mockResolvedValue([
      { id: "doc-1", title: "公众号排版指南", updatedAt: 1735689600000, size: 100 },
      { id: "doc-2", title: "周报草稿", updatedAt: 1735776000000, size: 200 },
    ]);
    const wrapper = mount(DocListPanel, {
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();
    await nextTick();

    const items = wrapper.findAll('[data-testid^="doc-item-"]');
    expect(items.length).toBe(2);

    const item1 = wrapper.find('[data-testid="doc-item-doc-1"]');
    expect(item1.exists()).toBe(true);
    expect(item1.text()).toContain("公众号排版指南");

    const item2 = wrapper.find('[data-testid="doc-item-doc-2"]');
    expect(item2.text()).toContain("周报草稿");

    // subtitle text must be non-empty and distinct from the title (a formatted timestamp)
    const item1Text = item1.text().replace("公众号排版指南", "").trim();
    expect(item1Text.length).toBeGreaterThan(0);
    const item2Text = item2.text().replace("周报草稿", "").trim();
    expect(item2Text.length).toBeGreaterThan(0);
    expect(item1Text).not.toBe(item2Text);
    wrapper.unmount();
  });
});

describe("AC-003: 当前文档指示激活态", () => {
  it("currentDocId 匹配的列表项带激活态 class，其余项不带", async () => {
    listDocumentsMock.mockResolvedValue([
      { id: "doc-1", title: "公众号排版指南", updatedAt: 1735689600000, size: 100 },
      { id: "doc-2", title: "周报草稿", updatedAt: 1735776000000, size: 200 },
    ]);
    const store = useEditorStore();
    store.currentDocId = "doc-2";

    const wrapper = mount(DocListPanel, {
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();
    await nextTick();

    const item1 = wrapper.find('[data-testid="doc-item-doc-1"]');
    const item2 = wrapper.find('[data-testid="doc-item-doc-2"]');

    const item1ActiveClass = item1.classes().find((c) => c.includes("--active"));
    const item2ActiveClass = item2.classes().find((c) => c.includes("--active"));

    expect(item1ActiveClass).toBeUndefined();
    expect(item2ActiveClass).toBeDefined();
    wrapper.unmount();
  });
});

describe("AC-004: loading 态显示骨架屏", () => {
  it("listDocuments pending 时显示 3 条 skeleton 行，resolve 后消失", async () => {
    let resolveDocs: (
      docs: Array<{ id: string; title: string; updatedAt: number; size: number }>
    ) => void = () => {};
    const pending = new Promise<
      Array<{ id: string; title: string; updatedAt: number; size: number }>
    >((resolve) => {
      resolveDocs = resolve;
    });
    listDocumentsMock.mockReturnValue(pending);

    const wrapper = mount(DocListPanel, {
      attachTo: document.body,
    });
    await nextTick();

    const skeletons = wrapper.findAll('[data-testid="doc-list-skeleton"]');
    expect(skeletons.length).toBe(3);

    resolveDocs([{ id: "doc-1", title: "公众号排版指南", updatedAt: 1735689600000, size: 100 }]);
    await nextTick();
    await nextTick();
    await nextTick();

    expect(wrapper.findAll('[data-testid="doc-list-skeleton"]').length).toBe(0);
    wrapper.unmount();
  });
});

describe("AC-005: empty 态显示创建引导", () => {
  it("resolve 空数组时显示「还没有文档」文案与「创建第一篇」链接，点击导航到 /themes", async () => {
    listDocumentsMock.mockResolvedValue([]);
    const wrapper = mount(DocListPanel, {
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();
    await nextTick();

    expect(wrapper.text()).toContain("还没有文档");

    const createFirst = wrapper.find('[data-testid="doc-list-create-first"]');
    expect(createFirst.exists()).toBe(true);

    await createFirst.trigger("click");
    await nextTick();

    expect(mockRouterPush).toHaveBeenCalledWith("/themes");
    wrapper.unmount();
  });
});

describe("AC-006: 点击非当前文档项触发路由切换", () => {
  it("点击非当前文档项时导航到 /docs/${id}", async () => {
    listDocumentsMock.mockResolvedValue([
      { id: "doc-1", title: "公众号排版指南", updatedAt: 1735689600000, size: 100 },
      { id: "doc-2", title: "周报草稿", updatedAt: 1735776000000, size: 200 },
    ]);
    const store = useEditorStore();
    store.currentDocId = "doc-1";

    const wrapper = mount(DocListPanel, {
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();
    await nextTick();

    const nonCurrentItem = wrapper.find('[data-testid="doc-item-doc-2"]');
    expect(nonCurrentItem.exists()).toBe(true);

    await nonCurrentItem.trigger("click");
    await nextTick();

    expect(mockRouterPush).toHaveBeenCalledWith("/docs/doc-2");
    wrapper.unmount();
  });
});
