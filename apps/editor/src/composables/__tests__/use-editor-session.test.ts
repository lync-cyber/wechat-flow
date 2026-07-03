import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Minimal coverage: first fetch → returns jwt; second call → cache hit, no re-fetch
describe("useEditorSession: getSessionToken", () => {
  let originalFetch: typeof globalThis.fetch;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalLocalStorage = globalThis.localStorage;
    // Clear any module-level cache between tests
    vi.resetModules();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("首次调用 → 发出 POST /api/v1/editor/session 并返回 jwt", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sessionJwt: "test-jwt-abc",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        refreshUntil: new Date(Date.now() + 7200000).toISOString(),
        scope: ["upload:images"],
        sessionId: "sess-001",
      }),
    });

    const { useEditorSession } = await import("../use-editor-session");
    const session = useEditorSession({ fetchImpl: fakeFetch as typeof fetch });
    const token = await session.getSessionToken();

    expect(token).toBe("test-jwt-abc");
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = fakeFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/editor/session");
    expect(opts.method).toBe("POST");
  });

  it("第二次调用 → 命中缓存，不重复发送请求", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sessionJwt: "cached-jwt",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        refreshUntil: new Date(Date.now() + 7200000).toISOString(),
        scope: [],
        sessionId: "sess-002",
      }),
    });

    const { useEditorSession } = await import("../use-editor-session");
    const session = useEditorSession({ fetchImpl: fakeFetch as typeof fetch });
    const t1 = await session.getSessionToken();
    const t2 = await session.getSessionToken();

    expect(t1).toBe("cached-jwt");
    expect(t2).toBe("cached-jwt");
    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });

  it("fetch 失败 → 返回 undefined（上传仍可继续，不抛出）", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { code: "UNAUTHORIZED", message: "auth failed" } }),
    });

    const { useEditorSession } = await import("../use-editor-session");
    const session = useEditorSession({ fetchImpl: fakeFetch as typeof fetch });
    const token = await session.getSessionToken();

    expect(token).toBeUndefined();
  });

  it("请求头包含 x-editor-origin", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sessionJwt: "jwt-origin-check",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        refreshUntil: new Date(Date.now() + 7200000).toISOString(),
        scope: [],
        sessionId: "sess-003",
      }),
    });

    const { useEditorSession } = await import("../use-editor-session");
    const session = useEditorSession({ fetchImpl: fakeFetch as typeof fetch });
    await session.getSessionToken();

    const [, opts] = fakeFetch.mock.calls[0] as [string, RequestInit];
    const headers = opts.headers as Record<string, string>;
    expect(headers["x-editor-origin"]).toBeDefined();
  });

  it("body 含 bootstrap=anonymous 且 deviceFingerprint 长度 ≥ 16", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sessionJwt: "jwt-body-check",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        refreshUntil: new Date(Date.now() + 7200000).toISOString(),
        scope: [],
        sessionId: "sess-004",
      }),
    });

    const { useEditorSession } = await import("../use-editor-session");
    const session = useEditorSession({ fetchImpl: fakeFetch as typeof fetch });
    await session.getSessionToken();

    const [, opts] = fakeFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as {
      bootstrap: string;
      deviceFingerprint: string;
    };
    expect(body.bootstrap).toBe("anonymous");
    expect(body.deviceFingerprint.length).toBeGreaterThanOrEqual(16);
  });
});

describe("SR-R2-006: getSessionToken JWT 主动续期", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("未到期（不在续期窗口内）→ 直接复用缓存，不发 refresh 请求", async () => {
    const now = Date.now();
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sessionJwt: "jwt-fresh",
        expiresAt: new Date(now + 15 * 60 * 1000).toISOString(),
        refreshUntil: new Date(now + 15 * 60 * 1000).toISOString(),
        scope: [],
        sessionId: "sess-fresh",
      }),
    });

    const { useEditorSession } = await import("../use-editor-session");
    const session = useEditorSession({ fetchImpl: fakeFetch as typeof fetch });
    const t1 = await session.getSessionToken();

    vi.advanceTimersByTime(60 * 1000);

    const t2 = await session.getSessionToken();

    expect(t1).toBe("jwt-fresh");
    expect(t2).toBe("jwt-fresh");
    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });

  it("进入续期窗口（<60s 到期）→ 调用 refresh 端点并更新缓存", async () => {
    const now = Date.now();
    const bootstrapFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionJwt: "jwt-old",
        expiresAt: new Date(now + 70 * 1000).toISOString(),
        refreshUntil: new Date(now + 70 * 1000).toISOString(),
        scope: [],
        sessionId: "sess-old",
      }),
    });
    const refreshResponse = {
      ok: true,
      json: async () => ({
        sessionJwt: "jwt-refreshed",
        expiresAt: new Date(now + 70 * 1000 + 15 * 60 * 1000).toISOString(),
        refreshUntil: new Date(now + 70 * 1000 + 15 * 60 * 1000).toISOString(),
        scope: [],
        sessionId: "sess-refreshed",
      }),
    };
    const fakeFetch = vi
      .fn()
      .mockImplementationOnce(bootstrapFetch)
      .mockResolvedValueOnce(refreshResponse);

    const { useEditorSession } = await import("../use-editor-session");
    const session = useEditorSession({ fetchImpl: fakeFetch as typeof fetch });
    const t1 = await session.getSessionToken();
    expect(t1).toBe("jwt-old");

    // Advance past (expiresAt - 60_000) so we're inside the refresh window
    vi.advanceTimersByTime(20 * 1000);

    const t2 = await session.getSessionToken();

    expect(t2).toBe("jwt-refreshed");
    expect(fakeFetch).toHaveBeenCalledTimes(2);
    const [refreshUrl, refreshOpts] = fakeFetch.mock.calls[1] as [string, RequestInit];
    expect(refreshUrl).toBe("/api/v1/editor/session/refresh");
    const headers = refreshOpts.headers as Record<string, string>;
    expect(headers.authorization ?? headers.Authorization).toBe("Bearer jwt-old");
  });

  it("refresh 失败（401）→ 回退重新匿名 bootstrap", async () => {
    const now = Date.now();
    const bootstrapResponse1 = {
      ok: true,
      json: async () => ({
        sessionJwt: "jwt-old",
        expiresAt: new Date(now + 70 * 1000).toISOString(),
        refreshUntil: new Date(now + 70 * 1000).toISOString(),
        scope: [],
        sessionId: "sess-old",
      }),
    };
    const refreshFailedResponse = {
      ok: false,
      status: 401,
      json: async () => ({ error: { code: "E_UNAUTHORIZED", message: "refresh rejected" } }),
    };
    const bootstrapResponse2 = {
      ok: true,
      json: async () => ({
        sessionJwt: "jwt-rebootstrapped",
        expiresAt: new Date(now + 70 * 1000 + 15 * 60 * 1000).toISOString(),
        refreshUntil: new Date(now + 70 * 1000 + 15 * 60 * 1000).toISOString(),
        scope: [],
        sessionId: "sess-rebootstrapped",
      }),
    };
    const fakeFetch = vi
      .fn()
      .mockResolvedValueOnce(bootstrapResponse1)
      .mockResolvedValueOnce(refreshFailedResponse)
      .mockResolvedValueOnce(bootstrapResponse2);

    const { useEditorSession } = await import("../use-editor-session");
    const session = useEditorSession({ fetchImpl: fakeFetch as typeof fetch });
    const t1 = await session.getSessionToken();
    expect(t1).toBe("jwt-old");

    vi.advanceTimersByTime(20 * 1000);

    const t2 = await session.getSessionToken();

    expect(t2).toBe("jwt-rebootstrapped");
    expect(fakeFetch).toHaveBeenCalledTimes(3);
    const [thirdUrl, thirdOpts] = fakeFetch.mock.calls[2] as [string, RequestInit];
    expect(thirdUrl).toBe("/api/v1/editor/session");
    expect(thirdOpts.method).toBe("POST");
  });
});
