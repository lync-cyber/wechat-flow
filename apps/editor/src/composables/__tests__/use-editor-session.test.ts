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
