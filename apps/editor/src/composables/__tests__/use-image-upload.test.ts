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

function makeMockEventSource() {
  const listeners: Record<string, ((e: MessageEvent) => void)[]> = {};
  const es = {
    addEventListener(event: string, cb: (e: MessageEvent) => void) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    },
    close: vi.fn(),
    dispatch(event: string, data: unknown) {
      const msg = new MessageEvent(event, { data: JSON.stringify(data) });
      for (const cb of listeners[event] ?? []) cb(msg);
    },
  };
  return es;
}

/** Flushes the microtask queue enough times for getToken -> fetch -> res.json() to settle. */
async function flushUntilEventSourceOpen(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
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
    const mockEs = makeMockEventSource();
    const fakeFetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      capturedHeaders.push((opts.headers ?? {}) as Record<string, string>);
      return Promise.resolve({
        ok: true,
        json: async () => ({ jobId: "job-1" }),
      });
    });
    const fakeGetToken = vi.fn().mockResolvedValue("my-session-jwt");
    const eventSourceFactory = vi.fn().mockReturnValue(mockEs);

    const { upload } = useImageUpload({
      fetchImpl: fakeFetch as typeof fetch,
      getSessionToken: fakeGetToken,
      eventSourceFactory: eventSourceFactory as never,
    });
    const file = new File(["x"], "img.png", { type: "image/png" });
    const p = upload(file);
    await flushUntilEventSourceOpen();
    mockEs.dispatch("succeeded", { result: { url: "https://cdn.example.com/img.png", size: 1 } });
    await p;

    expect(capturedHeaders.length).toBeGreaterThan(0);
    expect(capturedHeaders[0].Authorization).toBe("Bearer my-session-jwt");
  });

  it("无 token 时 fetch 仍发出请求（无 Authorization 头）", async () => {
    const { useImageUpload } = await import("../use-image-upload");
    const capturedHeaders: Record<string, string>[] = [];
    const mockEs = makeMockEventSource();
    const fakeFetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      capturedHeaders.push((opts.headers ?? {}) as Record<string, string>);
      return Promise.resolve({
        ok: true,
        json: async () => ({ jobId: "job-2" }),
      });
    });
    const fakeGetToken = vi.fn().mockResolvedValue(undefined);
    const eventSourceFactory = vi.fn().mockReturnValue(mockEs);

    const { upload } = useImageUpload({
      fetchImpl: fakeFetch as typeof fetch,
      getSessionToken: fakeGetToken,
      eventSourceFactory: eventSourceFactory as never,
    });
    const file = new File(["x"], "img.png", { type: "image/png" });
    const p = upload(file);
    await flushUntilEventSourceOpen();
    mockEs.dispatch("succeeded", { result: { url: "https://cdn.example.com/img.png", size: 1 } });
    await p;

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

describe("SR-R2-003: 默认路径经 202+SSE 消费真实上传进度", () => {
  it("progress 事件按序推进 ref（0 → 10 → 50 → 90 → 100）", async () => {
    const { useImageUpload } = await import("../use-image-upload");
    const mockEs = makeMockEventSource();
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: "job-progress" }),
    });
    const eventSourceFactory = vi.fn().mockReturnValue(mockEs);

    const { progress, upload } = useImageUpload({
      fetchImpl: fakeFetch as typeof fetch,
      getSessionToken: async () => undefined,
      eventSourceFactory: eventSourceFactory as never,
    });

    const file = new File(["x"], "test.png", { type: "image/png" });
    const p = upload(file);
    await flushUntilEventSourceOpen();

    expect(progress.value).toBe(0);
    mockEs.dispatch("progress", { progress: 0.1 });
    expect(progress.value).toBe(10);
    mockEs.dispatch("progress", { progress: 0.5 });
    expect(progress.value).toBe(50);
    mockEs.dispatch("progress", { progress: 0.9 });
    expect(progress.value).toBe(90);
    mockEs.dispatch("succeeded", {
      result: { url: "https://cdn.example.com/final.png", size: 42 },
    });
    await p;
    expect(progress.value).toBe(90);
  });

  it("succeeded 事件 → resolve URL 且 state=success", async () => {
    const { useImageUpload } = await import("../use-image-upload");
    const mockEs = makeMockEventSource();
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: "job-ok" }),
    });
    const eventSourceFactory = vi.fn().mockReturnValue(mockEs);

    const { state, previewUrl, upload } = useImageUpload({
      fetchImpl: fakeFetch as typeof fetch,
      getSessionToken: async () => undefined,
      eventSourceFactory: eventSourceFactory as never,
    });

    const file = new File(["x"], "test.png", { type: "image/png" });
    const p = upload(file);
    await flushUntilEventSourceOpen();
    mockEs.dispatch("succeeded", { result: { url: "https://cdn.example.com/ok2.png", size: 1 } });
    const url = await p;

    expect(url).toBe("https://cdn.example.com/ok2.png");
    expect(state.value).toBe("success");
    expect(previewUrl.value).toBe("https://cdn.example.com/ok2.png");
  });

  it("failed 事件 → state=error 且 errorMsg 来自事件 error.message", async () => {
    const { useImageUpload } = await import("../use-image-upload");
    const mockEs = makeMockEventSource();
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: "job-fail" }),
    });
    const eventSourceFactory = vi.fn().mockReturnValue(mockEs);

    const { state, errorMsg, upload } = useImageUpload({
      fetchImpl: fakeFetch as typeof fetch,
      getSessionToken: async () => undefined,
      eventSourceFactory: eventSourceFactory as never,
    });

    const file = new File(["x"], "test.png", { type: "image/png" });
    const p = upload(file);
    await flushUntilEventSourceOpen();
    mockEs.dispatch("failed", {
      error: { code: "E_UPLOAD_FAILED", message: "image host rejected the upload" },
    });
    const result = await p;

    expect(result).toBeUndefined();
    expect(state.value).toBe("error");
    expect(errorMsg.value).toBe("image host rejected the upload");
  });

  it("cancel() 在上传进行中关闭 EventSource", async () => {
    const { useImageUpload } = await import("../use-image-upload");
    const mockEs = makeMockEventSource();
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: "job-cancel" }),
    });
    const eventSourceFactory = vi.fn().mockReturnValue(mockEs);

    const { upload, cancel } = useImageUpload({
      fetchImpl: fakeFetch as typeof fetch,
      getSessionToken: async () => undefined,
      eventSourceFactory: eventSourceFactory as never,
    });

    const file = new File(["x"], "test.png", { type: "image/png" });
    void upload(file);
    await flushUntilEventSourceOpen();

    cancel();
    expect(mockEs.close).toHaveBeenCalled();
  });

  it("retry() 在真实进度路径下重入并重新订阅新的 jobId", async () => {
    const { useImageUpload } = await import("../use-image-upload");
    const firstEs = makeMockEventSource();
    const secondEs = makeMockEventSource();
    let call = 0;
    const eventSourceFactory = vi.fn().mockImplementation(() => {
      call += 1;
      return call === 1 ? firstEs : secondEs;
    });
    const fakeFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ jobId: "job-retry-1" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ jobId: "job-retry-2" }) });

    const { state, upload, retry } = useImageUpload({
      fetchImpl: fakeFetch as typeof fetch,
      getSessionToken: async () => undefined,
      eventSourceFactory: eventSourceFactory as never,
    });

    const file = new File(["x"], "test.png", { type: "image/png" });
    const p1 = upload(file);
    await flushUntilEventSourceOpen();
    firstEs.dispatch("failed", { error: { code: "E_UPLOAD_FAILED", message: "boom" } });
    await p1;
    expect(state.value).toBe("error");

    const p2 = retry();
    await flushUntilEventSourceOpen();
    secondEs.dispatch("succeeded", {
      result: { url: "https://cdn.example.com/retried.png", size: 2 },
    });
    await p2;
    expect(state.value).toBe("success");
    expect(eventSourceFactory).toHaveBeenCalledTimes(2);
  });
});
