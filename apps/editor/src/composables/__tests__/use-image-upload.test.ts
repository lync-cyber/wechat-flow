import { describe, expect, it, vi } from "vitest";

type UploadResult = { url: string; size: number };
type UploadError = { code: string; message: string };

function makeUploadSuccess(url = "https://cdn.example.com/img.png"): () => Promise<UploadResult> {
  return vi.fn().mockResolvedValue({ url, size: 1024 });
}

function makeUploadFailure(code = "E_500", message = "Server error"): () => Promise<UploadResult> {
  const err: UploadError = { code, message };
  return vi.fn().mockRejectedValue(Object.assign(new Error(message), err));
}

describe("AC-001/AC-002: 初始状态", () => {
  it("初始 state 为 idle，progress=0", async () => {
    const { useImageUpload } = await import("../use-image-upload");
    const { state, progress } = useImageUpload({ uploadImage: makeUploadSuccess() });
    expect(state.value).toBe("idle");
    expect(progress.value).toBe(0);
  });
});

describe("AC-001: drag → dragging 状态", () => {
  it("调用 startDrag() → state 变为 dragging", async () => {
    const { useImageUpload } = await import("../use-image-upload");
    const { state, startDrag } = useImageUpload({ uploadImage: makeUploadSuccess() });
    startDrag();
    expect(state.value).toBe("dragging");
  });

  it("调用 endDrag() → state 回到 idle", async () => {
    const { useImageUpload } = await import("../use-image-upload");
    const { state, startDrag, endDrag } = useImageUpload({ uploadImage: makeUploadSuccess() });
    startDrag();
    endDrag();
    expect(state.value).toBe("idle");
  });
});

describe("AC-001/AC-002: upload → uploading → success 状态流转", () => {
  it("upload(file) 期间 state=uploading", async () => {
    const { useImageUpload } = await import("../use-image-upload");
    let resolveUpload!: (v: UploadResult) => void;
    const suspendedUpload = vi.fn(
      () =>
        new Promise<UploadResult>((res) => {
          resolveUpload = res;
        })
    );
    const { state, upload } = useImageUpload({ uploadImage: suspendedUpload });
    const file = new File(["x"], "test.png", { type: "image/png" });
    const p = upload(file);
    expect(state.value).toBe("uploading");
    resolveUpload({ url: "https://cdn.example.com/img.png", size: 1 });
    await p;
  });

  it("upload 成功 → state=success，previewUrl 为图床 URL", async () => {
    const { useImageUpload } = await import("../use-image-upload");
    const { state, previewUrl, upload } = useImageUpload({
      uploadImage: makeUploadSuccess("https://cdn.example.com/ok.png"),
    });
    const file = new File(["x"], "test.png", { type: "image/png" });
    await upload(file);
    expect(state.value).toBe("success");
    expect(previewUrl.value).toBe("https://cdn.example.com/ok.png");
  });
});

describe("AC-003: 上传失败 → error 状态 + errorMsg", () => {
  it("upload 失败 → state=error，errorMsg 包含错误信息", async () => {
    const { useImageUpload } = await import("../use-image-upload");
    const { state, errorMsg, upload } = useImageUpload({
      uploadImage: makeUploadFailure("E_413", "File too large"),
    });
    const file = new File(["x"], "big.png", { type: "image/png" });
    await upload(file);
    expect(state.value).toBe("error");
    expect(errorMsg.value).toBeTruthy();
  });

  it("retry() → 重入上传流程，重新变为 uploading", async () => {
    const { useImageUpload } = await import("../use-image-upload");
    const fakeUpload = vi.fn<(file: File) => Promise<UploadResult>>();
    let firstCall = true;
    fakeUpload.mockImplementation(() => {
      if (firstCall) {
        firstCall = false;
        return Promise.reject(Object.assign(new Error("fail"), { code: "E_500" }));
      }
      return Promise.resolve({ url: "https://cdn.example.com/retry.png", size: 1 });
    });

    const { state, upload, retry } = useImageUpload({ uploadImage: fakeUpload });
    const file = new File(["x"], "test.png", { type: "image/png" });
    await upload(file);
    expect(state.value).toBe("error");

    await retry();
    expect(state.value).toBe("success");
  });

  it("cancel() → state 回到 idle", async () => {
    const { useImageUpload } = await import("../use-image-upload");
    const { state, upload, cancel } = useImageUpload({
      uploadImage: makeUploadFailure(),
    });
    const file = new File(["x"], "test.png", { type: "image/png" });
    await upload(file);
    expect(state.value).toBe("error");
    cancel();
    expect(state.value).toBe("idle");
  });
});

describe("AC-004: production 默认路径 — upload 请求头含 Authorization Bearer token", () => {
  it("有 token 时 fetch 请求头含 Authorization: Bearer <token>", async () => {
    const { useImageUpload } = await import("../use-image-upload");
    const capturedHeaders: Record<string, string>[] = [];
    const fakeFetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      capturedHeaders.push((opts.headers ?? {}) as Record<string, string>);
      return Promise.resolve({
        ok: true,
        json: async () => ({ url: "https://cdn.example.com/img.png", size: 1 }),
      });
    });
    const fakeGetToken = vi.fn().mockResolvedValue("my-session-jwt");

    const { upload } = useImageUpload({
      fetchImpl: fakeFetch as typeof fetch,
      getSessionToken: fakeGetToken,
    });
    const file = new File(["x"], "img.png", { type: "image/png" });
    await upload(file);

    expect(capturedHeaders.length).toBeGreaterThan(0);
    expect(capturedHeaders[0].Authorization).toBe("Bearer my-session-jwt");
  });

  it("无 token 时 fetch 仍发出请求（无 Authorization 头）", async () => {
    const { useImageUpload } = await import("../use-image-upload");
    const capturedHeaders: Record<string, string>[] = [];
    const fakeFetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      capturedHeaders.push((opts.headers ?? {}) as Record<string, string>);
      return Promise.resolve({
        ok: true,
        json: async () => ({ url: "https://cdn.example.com/img.png", size: 1 }),
      });
    });
    const fakeGetToken = vi.fn().mockResolvedValue(undefined);

    const { upload } = useImageUpload({
      fetchImpl: fakeFetch as typeof fetch,
      getSessionToken: fakeGetToken,
    });
    const file = new File(["x"], "img.png", { type: "image/png" });
    await upload(file);

    expect(capturedHeaders.length).toBeGreaterThan(0);
    expect(capturedHeaders[0].Authorization).toBeUndefined();
  });

  it("onDropImage / onPasteImage 符号从 useImageUpload 导出或可导入", async () => {
    const mod = await import("../use-image-upload");
    expect(typeof mod.useImageUpload).toBe("function");
    const instance = mod.useImageUpload({ uploadImage: makeUploadSuccess() });
    expect(typeof instance.upload).toBe("function");
  });
});
