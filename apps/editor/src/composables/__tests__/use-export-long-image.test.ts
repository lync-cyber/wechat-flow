import { describe, expect, it, vi } from "vitest";

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

function makeFakeFetch(jobId = "job-abc") {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ jobId }),
  });
}

describe("AC-001: enqueue 请求形状", () => {
  it("POST /api/v1/jobs，body.kind=long-image-render，body.input.html 为渲染后 HTML", async () => {
    const fakeFetch = makeFakeFetch();
    const composeExportHtml = vi.fn().mockResolvedValue("<html>rendered</html>");
    const getSessionToken = vi.fn().mockResolvedValue("session-jwt-123");
    const esFactory = vi.fn().mockReturnValue(makeMockEventSource());

    const { useExportLongImage } = await import("../use-export-long-image");
    const { start } = useExportLongImage({
      fetchImpl: fakeFetch as unknown as typeof fetch,
      getSessionToken,
      composeExportHtml,
      eventSourceFactory: esFactory as never,
    });

    await start({ markdown: "# hi", themeId: "default" });

    expect(fakeFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = fakeFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/jobs");
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body as string) as {
      kind: string;
      input: { html: string };
    };
    expect(body.kind).toBe("long-image-render");
    expect(body.input.html).toBe("<html>rendered</html>");
  });

  it("Authorization 头携带编辑器会话 JWT，不传 apiKeyId", async () => {
    const fakeFetch = makeFakeFetch();
    const composeExportHtml = vi.fn().mockResolvedValue("<html>rendered</html>");
    const getSessionToken = vi.fn().mockResolvedValue("session-jwt-abc");
    const esFactory = vi.fn().mockReturnValue(makeMockEventSource());

    const { useExportLongImage } = await import("../use-export-long-image");
    const { start } = useExportLongImage({
      fetchImpl: fakeFetch as unknown as typeof fetch,
      getSessionToken,
      composeExportHtml,
      eventSourceFactory: esFactory as never,
    });

    await start({ markdown: "# hi", themeId: "default" });

    const [, opts] = fakeFetch.mock.calls[0] as [string, RequestInit];
    const headers = opts.headers as Record<string, string>;
    expect(headers.authorization ?? headers.Authorization).toBe("Bearer session-jwt-abc");
    const body = JSON.parse(opts.body as string) as { apiKeyId?: string };
    expect(body.apiKeyId).toBeUndefined();
  });

  it("enqueue 成功后 useSseJob 订阅返回的 jobId", async () => {
    const fakeFetch = makeFakeFetch("job-xyz");
    const composeExportHtml = vi.fn().mockResolvedValue("<html>rendered</html>");
    const getSessionToken = vi.fn().mockResolvedValue("jwt");
    const esFactory = vi.fn().mockReturnValue(makeMockEventSource());

    const { useExportLongImage } = await import("../use-export-long-image");
    const { start } = useExportLongImage({
      fetchImpl: fakeFetch as unknown as typeof fetch,
      getSessionToken,
      composeExportHtml,
      eventSourceFactory: esFactory as never,
    });

    await start({ markdown: "# hi", themeId: "default" });

    expect(esFactory).toHaveBeenCalledWith("/api/v1/jobs/job-xyz/events");
  });
});

describe("AC-002: progress → percent 更新", () => {
  it("SSE progress 事件更新 percent 与 status", async () => {
    const fakeFetch = makeFakeFetch("job-progress");
    const composeExportHtml = vi.fn().mockResolvedValue("<html></html>");
    const getSessionToken = vi.fn().mockResolvedValue("jwt");
    const mockEs = makeMockEventSource();
    const esFactory = vi.fn().mockReturnValue(mockEs);

    const { useExportLongImage } = await import("../use-export-long-image");
    const { start, status, percent } = useExportLongImage({
      fetchImpl: fakeFetch as unknown as typeof fetch,
      getSessionToken,
      composeExportHtml,
      eventSourceFactory: esFactory as never,
    });

    await start({ markdown: "# hi", themeId: "default" });
    mockEs.dispatch("progress", { progress: 42 });

    expect(status.value).toBe("running");
    expect(percent.value).toBe(42);
  });
});

describe("AC-003: succeeded → result 保存", () => {
  it("SSE succeeded 事件后 status=completed，result 保存返回结果", async () => {
    const fakeFetch = makeFakeFetch("job-done");
    const composeExportHtml = vi.fn().mockResolvedValue("<html></html>");
    const getSessionToken = vi.fn().mockResolvedValue("jwt");
    const mockEs = makeMockEventSource();
    const esFactory = vi.fn().mockReturnValue(mockEs);

    const { useExportLongImage } = await import("../use-export-long-image");
    const { start, status, result } = useExportLongImage({
      fetchImpl: fakeFetch as unknown as typeof fetch,
      getSessionToken,
      composeExportHtml,
      eventSourceFactory: esFactory as never,
    });

    await start({ markdown: "# hi", themeId: "default" });
    mockEs.dispatch("succeeded", { result: { url: "https://cdn.example.com/long.png" } });

    expect(status.value).toBe("completed");
    expect((result.value as { url: string } | undefined)?.url).toBe(
      "https://cdn.example.com/long.png"
    );
  });
});

describe("enqueue 请求失败", () => {
  it("HTTP 非 2xx → status=failed，error 填充", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { code: "E_INTERNAL", message: "boom" } }),
    });
    const composeExportHtml = vi.fn().mockResolvedValue("<html></html>");
    const getSessionToken = vi.fn().mockResolvedValue("jwt");
    const esFactory = vi.fn().mockReturnValue(makeMockEventSource());

    const { useExportLongImage } = await import("../use-export-long-image");
    const { start, status, error } = useExportLongImage({
      fetchImpl: fakeFetch as unknown as typeof fetch,
      getSessionToken,
      composeExportHtml,
      eventSourceFactory: esFactory as never,
    });

    await start({ markdown: "# hi", themeId: "default" });

    expect(status.value).toBe("failed");
    expect(error.value?.code).toBe("E_INTERNAL");
    expect(esFactory).not.toHaveBeenCalled();
  });
});
