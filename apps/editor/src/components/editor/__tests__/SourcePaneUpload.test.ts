import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import SourcePane from "../SourcePane.vue";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// Helper: create a DataTransfer-like object with image files
function makeImageDragEvent(type: string): DragEvent {
  const file = new File(["x"], "photo.png", { type: "image/png" });
  const dt = {
    files: [file] as unknown as FileList,
    types: ["Files"],
    items: [{ kind: "file", type: "image/png", getAsFile: () => file }],
    dropEffect: "copy",
    effectAllowed: "all",
  };
  const ev = new DragEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "dataTransfer", { value: dt, writable: false });
  return ev;
}

// Helper: create a paste ClipboardEvent with image
function makeImagePasteEvent(): ClipboardEvent {
  const file = new File(["x"], "paste.png", { type: "image/png" });
  const item = {
    kind: "file",
    type: "image/png",
    getAsFile: () => file,
  };
  const ev = new ClipboardEvent("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "clipboardData", {
    value: {
      items: [item],
      files: [file] as unknown as FileList,
    },
    writable: false,
  });
  return ev;
}

describe("AC-001: drag drop → overlay 显示 uploading 状态并插入占位文本", () => {
  it("drop image 后 ImageUploadOverlay 进入 uploading 状态", async () => {
    vi.useFakeTimers();
    // Inject a suspended upload so we can observe the uploading state
    let resolveUpload!: (v: { url: string; size: number }) => void;
    const fakeUpload = vi.fn().mockImplementation(
      () =>
        new Promise<{ url: string; size: number }>((res) => {
          resolveUpload = res;
        })
    );
    const fakeGetToken = vi.fn().mockResolvedValue(undefined);

    const wrapper = mount(SourcePane, {
      props: {
        modelValue: "",
        uploadImageFn: fakeUpload,
        getSessionTokenFn: fakeGetToken,
      },
      attachTo: document.body,
    });
    await nextTick();

    const pane = wrapper.find('[data-testid="source-pane"]');
    pane.element.dispatchEvent(makeImageDragEvent("dragenter"));
    pane.element.dispatchEvent(makeImageDragEvent("dragover"));
    await nextTick();

    pane.element.dispatchEvent(makeImageDragEvent("drop"));
    await nextTick();

    const overlay = wrapper.find('[data-testid="image-upload-overlay"]');
    expect(overlay.exists()).toBe(true);

    resolveUpload({ url: "https://cdn.example.com/img.png", size: 1 });
    wrapper.unmount();
  });

  it("drop image 后 editor 文档中插入占位文本", async () => {
    vi.useFakeTimers();
    let resolveUpload!: (v: { url: string; size: number }) => void;
    const fakeUpload = vi.fn().mockImplementation(
      () =>
        new Promise<{ url: string; size: number }>((res) => {
          resolveUpload = res;
        })
    );

    const wrapper = mount(SourcePane, {
      props: {
        modelValue: "",
        uploadImageFn: fakeUpload,
        getSessionTokenFn: vi.fn().mockResolvedValue(undefined),
      },
      attachTo: document.body,
    });
    await nextTick();

    const pane = wrapper.find('[data-testid="source-pane"]');
    pane.element.dispatchEvent(makeImageDragEvent("drop"));
    await nextTick();

    // biome-ignore lint/suspicious/noExplicitAny: test access to exposed ref
    const vm = wrapper.vm as any;
    const view = vm.editorView;
    expect(view).not.toBeNull();
    const docText: string = view.state.doc.toString();
    expect(docText).toContain("uploading");

    resolveUpload({ url: "https://cdn.example.com/img.png", size: 1 });
    wrapper.unmount();
  });

  it("上传成功后 → 占位文本被替换为最终图床 URL", async () => {
    const fakeUpload = vi
      .fn()
      .mockResolvedValue({ url: "https://cdn.example.com/final.png", size: 1 });

    const wrapper = mount(SourcePane, {
      props: {
        modelValue: "",
        uploadImageFn: fakeUpload,
        getSessionTokenFn: vi.fn().mockResolvedValue(undefined),
      },
      attachTo: document.body,
    });
    await nextTick();

    const pane = wrapper.find('[data-testid="source-pane"]');
    pane.element.dispatchEvent(makeImageDragEvent("drop"));
    await nextTick();
    // Let microtasks settle (upload resolves)
    await new Promise((r) => setTimeout(r, 0));
    await nextTick();

    // biome-ignore lint/suspicious/noExplicitAny: test access to exposed ref
    const vm = wrapper.vm as any;
    const view = vm.editorView;
    const docText: string = view.state.doc.toString();
    expect(docText).toContain("https://cdn.example.com/final.png");
    expect(docText).not.toContain("uploading");
    wrapper.unmount();
  });
});

describe("AC-002: paste image → 同一上传流程", () => {
  it("paste 含 image/* → 调用上传函数", async () => {
    const fakeUpload = vi
      .fn()
      .mockResolvedValue({ url: "https://cdn.example.com/paste.png", size: 1 });

    const wrapper = mount(SourcePane, {
      props: {
        modelValue: "",
        uploadImageFn: fakeUpload,
        getSessionTokenFn: vi.fn().mockResolvedValue(undefined),
      },
      attachTo: document.body,
    });
    await nextTick();

    const pane = wrapper.find('[data-testid="source-pane"]');
    pane.element.dispatchEvent(makeImagePasteEvent());
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));

    expect(fakeUpload).toHaveBeenCalledTimes(1);
    const [calledFile] = fakeUpload.mock.calls[0] as [File];
    expect(calledFile.type).toBe("image/png");
    wrapper.unmount();
  });

  it("paste image 后 editor 文档占位被替换为图床 URL", async () => {
    const fakeUpload = vi
      .fn()
      .mockResolvedValue({ url: "https://cdn.example.com/paste-ok.png", size: 1 });

    const wrapper = mount(SourcePane, {
      props: {
        modelValue: "",
        uploadImageFn: fakeUpload,
        getSessionTokenFn: vi.fn().mockResolvedValue(undefined),
      },
      attachTo: document.body,
    });
    await nextTick();

    const pane = wrapper.find('[data-testid="source-pane"]');
    pane.element.dispatchEvent(makeImagePasteEvent());
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));
    await nextTick();

    // biome-ignore lint/suspicious/noExplicitAny: test access to exposed ref
    const vm = wrapper.vm as any;
    const view = vm.editorView;
    const docText: string = view.state.doc.toString();
    expect(docText).toContain("https://cdn.example.com/paste-ok.png");
    wrapper.unmount();
  });
});

describe("AC-003: 上传失败 → error 状态，点重试重入，点取消删占位", () => {
  it("upload 失败 → overlay 显示 error 状态", async () => {
    const fakeUpload = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("网络错误"), { code: "E_500" }));

    const wrapper = mount(SourcePane, {
      props: {
        modelValue: "",
        uploadImageFn: fakeUpload,
        getSessionTokenFn: vi.fn().mockResolvedValue(undefined),
      },
      attachTo: document.body,
    });
    await nextTick();

    const pane = wrapper.find('[data-testid="source-pane"]');
    pane.element.dispatchEvent(makeImageDragEvent("drop"));
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));
    await nextTick();

    const overlay = wrapper.find('[data-testid="overlay-error"]');
    expect(overlay.exists()).toBe(true);
    wrapper.unmount();
  });

  it("error 后点取消 → 占位文本从 editor 删除", async () => {
    const fakeUpload = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("失败"), { code: "E_500" }));

    const wrapper = mount(SourcePane, {
      props: {
        modelValue: "",
        uploadImageFn: fakeUpload,
        getSessionTokenFn: vi.fn().mockResolvedValue(undefined),
      },
      attachTo: document.body,
    });
    await nextTick();

    const pane = wrapper.find('[data-testid="source-pane"]');
    pane.element.dispatchEvent(makeImageDragEvent("drop"));
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));
    await nextTick();

    await wrapper.find('[data-testid="cancel-btn"]').trigger("click");
    await nextTick();

    // biome-ignore lint/suspicious/noExplicitAny: test access to exposed ref
    const vm = wrapper.vm as any;
    const view = vm.editorView;
    const docText: string = view.state.doc.toString();
    expect(docText).not.toContain("uploading");
    wrapper.unmount();
  });
});

describe("AC-004: onDropImage / onPasteImage 透传 JWT", () => {
  it("SourcePane 可接受 uploadImageFn prop（生产路径注入点）", async () => {
    const fakeUpload = vi
      .fn()
      .mockResolvedValue({ url: "https://cdn.example.com/jwt.png", size: 1 });
    const fakeGetToken = vi.fn().mockResolvedValue("sess-jwt-123");

    const wrapper = mount(SourcePane, {
      props: {
        modelValue: "",
        uploadImageFn: fakeUpload,
        getSessionTokenFn: fakeGetToken,
      },
      attachTo: document.body,
    });
    await nextTick();

    const pane = wrapper.find('[data-testid="source-pane"]');
    pane.element.dispatchEvent(makeImageDragEvent("drop"));
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));

    // Token was fetched
    expect(fakeGetToken).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("默认路径（无注入）：drop image 后 SourcePane 有 onDropImage 处理逻辑", async () => {
    const wrapper = mount(SourcePane, {
      props: { modelValue: "" },
      attachTo: document.body,
    });
    await nextTick();

    // The component must handle drop events without throwing
    const pane = wrapper.find('[data-testid="source-pane"]');
    expect(() => {
      pane.element.dispatchEvent(makeImageDragEvent("drop"));
    }).not.toThrow();

    wrapper.unmount();
  });
});
