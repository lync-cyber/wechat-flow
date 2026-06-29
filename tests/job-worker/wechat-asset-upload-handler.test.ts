/**
 * T-126 AC-005~006, AC-009 — wechat-asset-upload handler: access_token + cache + worker registry.
 *
 * Tests verify:
 * AC-005: handler fetches access_token from /cgi-bin/token and passes it (non-empty) to upload
 * AC-006: access_token is cached in-memory — /cgi-bin/token called only once for two handler invocations
 * AC-009: apps/job-worker/src/index.ts registers wechat-asset-upload handler (worker registry)
 *
 * All tests must FAIL until:
 *   - createWechatAssetUploadHandler gains a `getAccessToken` dep (or fetches /cgi-bin/token internally)
 *   - Access token cache is implemented (TTL-based, shared across calls)
 *   - job-worker index.ts registers the wechat-asset-upload worker
 */

import { describe, expect, it, vi } from "vitest";
import { createWechatAssetUploadHandler } from "../../apps/job-worker/src/handlers/wechat-asset-upload.ts";
import { WORKER_QUEUE_KINDS } from "../../apps/job-worker/src/worker-kinds.ts";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

function makeBaseJob(apiKeyId = "key-001") {
  return {
    data: {
      kind: "wechat-asset-upload" as const,
      apiKeyId,
      input: {
        imageUrl: "https://cdn.example.com/img.png",
        type: "image" as const,
      },
    },
  };
}

function makeUploadResult() {
  return {
    mediaId: "media_id_from_wechat",
    url: "https://wechat-cdn.example.com/media/abc123",
    type: "image" as const,
  };
}

// ---------------------------------------------------------------------------
// AC-005: handler fetches access_token via /cgi-bin/token and uses it (not empty string)
// ---------------------------------------------------------------------------

describe("AC-005: handler fetches access_token from /cgi-bin/token and passes non-empty token to upload", () => {
  it("handler calls getAccessToken dep and passes returned token to upload creds", async () => {
    const mockGetAccessToken = vi.fn().mockResolvedValue("mock-token-abc");
    const mockUpload = vi.fn().mockResolvedValue(makeUploadResult());
    const mockLoadCredentials = vi.fn().mockResolvedValue({
      appId: "wx_app_001",
      appSecret: "wx_secret_001",
    });

    // Handler must accept a getAccessToken dep (new dep for T-126)
    const handler = createWechatAssetUploadHandler({
      loadCredentials: mockLoadCredentials,
      upload: mockUpload,
      getAccessToken: mockGetAccessToken,
    });

    await handler(makeBaseJob());

    // getAccessToken must have been called
    expect(mockGetAccessToken).toHaveBeenCalledOnce();

    // upload must have been called with non-empty accessToken
    const uploadCreds = mockUpload.mock.calls[0]?.[1];
    expect(uploadCreds?.accessToken).toBe("mock-token-abc");
    expect(uploadCreds?.accessToken).not.toBe("");
  });

  it("getAccessToken is called with appId and appSecret from credential-loader", async () => {
    const tokenCalls: Array<{ appId: string; appSecret: string }> = [];
    const mockGetAccessToken = vi
      .fn()
      .mockImplementation(async (appId: string, appSecret: string) => {
        tokenCalls.push({ appId, appSecret });
        return "token-from-cgi";
      });
    const mockUpload = vi.fn().mockResolvedValue(makeUploadResult());

    const handler = createWechatAssetUploadHandler({
      loadCredentials: vi
        .fn()
        .mockResolvedValue({ appId: "server-app-id", appSecret: "server-secret" }),
      upload: mockUpload,
      getAccessToken: mockGetAccessToken,
    });

    await handler(makeBaseJob());

    expect(tokenCalls).toHaveLength(1);
    expect(tokenCalls[0]?.appId).toBe("server-app-id");
    expect(tokenCalls[0]?.appSecret).toBe("server-secret");
  });

  it("upload creds accessToken equals the value returned by getAccessToken", async () => {
    const specificToken = "specific-access-token-for-assertion";
    const mockUpload = vi.fn().mockResolvedValue(makeUploadResult());

    const handler = createWechatAssetUploadHandler({
      loadCredentials: vi.fn().mockResolvedValue({ appId: "a", appSecret: "b" }),
      upload: mockUpload,
      getAccessToken: vi.fn().mockResolvedValue(specificToken),
    });

    await handler(makeBaseJob());

    const uploadCreds = mockUpload.mock.calls[0]?.[1];
    expect(uploadCreds?.accessToken).toBe(specificToken);
  });

  it("access_token fetched from /cgi-bin/token mock — non-empty token reaches upload", async () => {
    // Simulate the getAccessToken implementation using a mock /cgi-bin/token endpoint
    const mockHttpFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "mock-token-abc", expires_in: 7200 }),
    });

    // getAccessToken implemented inline calling mockHttpFetch (simulates real fetch dep)
    const getAccessToken = async (appId: string, appSecret: string) => {
      const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
      const resp = await mockHttpFetch(url);
      const body = (await resp.json()) as { access_token: string; expires_in: number };
      return body.access_token;
    };

    const mockUpload = vi.fn().mockResolvedValue(makeUploadResult());

    const handler = createWechatAssetUploadHandler({
      loadCredentials: vi.fn().mockResolvedValue({ appId: "wx_test", appSecret: "wx_sec_test" }),
      upload: mockUpload,
      getAccessToken,
    });

    await handler(makeBaseJob());

    const uploadCreds = mockUpload.mock.calls[0]?.[1];
    expect(uploadCreds?.accessToken).toBe("mock-token-abc");
    expect(mockHttpFetch).toHaveBeenCalledWith(expect.stringContaining("/cgi-bin/token"));
  });
});

// ---------------------------------------------------------------------------
// AC-006: access_token in-memory cache — /cgi-bin/token called only once within TTL
// ---------------------------------------------------------------------------

describe("AC-006: access_token is cached in-memory — getAccessToken called once for two handler invocations within TTL", () => {
  it("two handler invocations within TTL call getAccessToken only once", async () => {
    const mockGetAccessToken = vi.fn().mockResolvedValue("cached-token-xyz");
    const mockUpload = vi.fn().mockResolvedValue(makeUploadResult());

    // Handler must share a cache across invocations (same factory instance)
    const handler = createWechatAssetUploadHandler({
      loadCredentials: vi.fn().mockResolvedValue({ appId: "wx_cache", appSecret: "wx_cache_sec" }),
      upload: mockUpload,
      getAccessToken: mockGetAccessToken,
    });

    await handler(makeBaseJob("key-cache-001"));
    await handler(makeBaseJob("key-cache-002"));

    // getAccessToken must be called only once (cache hit on second invocation)
    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);

    // Both upload calls must use the same cached token
    const firstToken = mockUpload.mock.calls[0]?.[1]?.accessToken;
    const secondToken = mockUpload.mock.calls[1]?.[1]?.accessToken;
    expect(firstToken).toBe("cached-token-xyz");
    expect(secondToken).toBe("cached-token-xyz");
  });

  it("cache is invalidated after TTL — getAccessToken called again after expiry", async () => {
    const nowRef = { now: Date.now() };
    let callCount = 0;
    const mockGetAccessToken = vi.fn().mockImplementation(async () => {
      callCount++;
      return `token-call-${callCount}`;
    });
    const mockUpload = vi.fn().mockResolvedValue(makeUploadResult());

    // Handler with short TTL (or expired clock) — simulate via a clock dep
    const handler = createWechatAssetUploadHandler({
      loadCredentials: vi.fn().mockResolvedValue({ appId: "wx_ttl", appSecret: "wx_ttl_sec" }),
      upload: mockUpload,
      getAccessToken: mockGetAccessToken,
      // clock injected to simulate time passing; TTL = 0 means always expired
      clock: () => nowRef.now,
      tokenTtlSeconds: 0,
    });

    await handler(makeBaseJob("key-ttl-001"));

    // Advance clock past TTL
    nowRef.now += 10_000;

    await handler(makeBaseJob("key-ttl-002"));

    // After TTL expiry, getAccessToken must be called again
    expect(mockGetAccessToken).toHaveBeenCalledTimes(2);
    expect(mockUpload.mock.calls[0]?.[1]?.accessToken).toBe("token-call-1");
    expect(mockUpload.mock.calls[1]?.[1]?.accessToken).toBe("token-call-2");
  });
});

// ---------------------------------------------------------------------------
// AC-009: apps/job-worker/src/index.ts registers wechat-asset-upload worker
// ---------------------------------------------------------------------------

describe("AC-009: job-worker index registers wechat-asset-upload handler", () => {
  it("WORKER_QUEUE_KINDS includes wechat-asset-upload — the authoritative list used by index.ts", () => {
    // AC-009: the queue name constant is the single source of truth for worker registration.
    // index.ts derives all Worker instances from WORKER_QUEUE_KINDS, so this assertion
    // is a zero-side-effect proxy for the registration contract.
    expect(WORKER_QUEUE_KINDS).toContain("wechat-asset-upload");
  });

  it("createWechatAssetUploadHandler factory is importable from the handlers directory", async () => {
    const mod = await import("../../apps/job-worker/src/handlers/wechat-asset-upload.ts");
    // It must export a factory that returns a callable handler
    const handler = mod.createWechatAssetUploadHandler({
      loadCredentials: vi.fn().mockResolvedValue({ appId: "a", appSecret: "b" }),
      upload: vi.fn().mockResolvedValue(makeUploadResult()),
      getAccessToken: vi.fn().mockResolvedValue("token"),
    });

    // Calling the handler with a valid job must return the upload result
    const result = await handler(makeBaseJob());
    expect(result.mediaId).toBe("media_id_from_wechat");
    expect(result.url).toBe("https://wechat-cdn.example.com/media/abc123");
  });

  it("registered handler processes a job and returns result with mediaId and url", async () => {
    // Direct handler invocation test — confirms the handler registered in index would work
    const handler = createWechatAssetUploadHandler({
      loadCredentials: vi.fn().mockResolvedValue({ appId: "wx_reg", appSecret: "wx_reg_sec" }),
      upload: vi.fn().mockResolvedValue({
        mediaId: "registered_media_001",
        url: "https://wechat-cdn.example.com/media/registered_001",
        type: "image" as const,
      }),
      getAccessToken: vi.fn().mockResolvedValue("reg-token"),
    });

    const result = await handler(makeBaseJob());

    expect(result.mediaId).toBe("registered_media_001");
    expect(result.url).toBe("https://wechat-cdn.example.com/media/registered_001");
    expect(result.type).toBe("image");
  });
});
