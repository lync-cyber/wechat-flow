/**
 * T-077: M-010 wechat-asset uploader + BullMQ kind `wechat-asset-upload`
 *
 * AC-001: POST /api/v1/wechat-assets/upload returns { jobId: uuid }
 * AC-002: BullMQ kind `wechat-asset-upload` worker calls uploader.ts using server-held credentials
 * AC-003: Job.result contains { mediaId, url, type }; failure maps errcode to error.code
 * AC-004: Full call path mock — credential-loader → uploader → media_id parse
 */

import { describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Types used across all ACs
// ---------------------------------------------------------------------------

interface WechatAssetUploadInput {
  imageUrl: string;
  type: "image" | "voice" | "video" | "thumb";
}

interface WechatUploadResult {
  mediaId: string;
  url: string;
  type: "image" | "voice" | "video" | "thumb";
}

interface WechatJobError {
  code: string;
  message: string;
}

// ---------------------------------------------------------------------------
// AC-001: POST /api/v1/wechat-assets/upload returns { jobId: uuid }
// ---------------------------------------------------------------------------

describe("AC-001: POST /api/v1/wechat-assets/upload — enqueues job and returns { jobId }", () => {
  it("returns 200 with a uuid jobId when imageUrl and type are provided", async () => {
    const { createWechatAssetsApp } = await import("../../apps/relay/src/routes/wechat-assets.ts");

    const enqueuedJobs: Array<{ kind: string; input: unknown }> = [];
    const fakeJobId = "550e8400-e29b-41d4-a716-446655440000";
    const mockEnqueue = vi.fn().mockResolvedValue(fakeJobId);

    const app = createWechatAssetsApp({ enqueue: mockEnqueue });
    const body: WechatAssetUploadInput = {
      imageUrl: "https://example.com/photo.jpg",
      type: "image",
    };

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { jobId: string };
    expect(json.jobId).toBe(fakeJobId);
  });

  it("enqueues with BullMQ kind 'wechat-asset-upload'", async () => {
    const { createWechatAssetsApp } = await import("../../apps/relay/src/routes/wechat-assets.ts");

    const calls: Array<{ kind: string; input: unknown; apiKeyId: string }> = [];
    const mockEnqueue = vi
      .fn()
      .mockImplementation(async (kind: string, input: unknown, apiKeyId: string) => {
        calls.push({ kind, input, apiKeyId });
        return "job-uuid-001";
      });

    const app = createWechatAssetsApp({ enqueue: mockEnqueue });
    await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl: "https://example.com/img.jpg", type: "image" }),
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.kind).toBe("wechat-asset-upload");
  });

  it("passes imageUrl and type through to the enqueued job input", async () => {
    const { createWechatAssetsApp } = await import("../../apps/relay/src/routes/wechat-assets.ts");

    const calls: Array<{ kind: string; input: unknown; apiKeyId: string }> = [];
    const mockEnqueue = vi
      .fn()
      .mockImplementation(async (kind: string, input: unknown, apiKeyId: string) => {
        calls.push({ kind, input, apiKeyId });
        return "job-uuid-002";
      });

    const app = createWechatAssetsApp({ enqueue: mockEnqueue });
    const body: WechatAssetUploadInput = {
      imageUrl: "https://example.com/thumb.jpg",
      type: "thumb",
    };
    await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const jobInput = calls[0]?.input as WechatAssetUploadInput;
    expect(jobInput.imageUrl).toBe("https://example.com/thumb.jpg");
    expect(jobInput.type).toBe("thumb");
  });

  it("returns 400 when imageUrl field is missing", async () => {
    const { createWechatAssetsApp } = await import("../../apps/relay/src/routes/wechat-assets.ts");

    const mockEnqueue = vi.fn().mockResolvedValue("should-not-enqueue");
    const app = createWechatAssetsApp({ enqueue: mockEnqueue });

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "image" }),
    });

    expect(res.status).toBe(400);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it("returns 400 when type is not one of image|voice|video|thumb", async () => {
    const { createWechatAssetsApp } = await import("../../apps/relay/src/routes/wechat-assets.ts");

    const mockEnqueue = vi.fn().mockResolvedValue("should-not-enqueue");
    const app = createWechatAssetsApp({ enqueue: mockEnqueue });

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl: "https://example.com/x.jpg", type: "document" }),
    });

    expect(res.status).toBe(400);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it("returns 400 when body is not valid JSON", async () => {
    const { createWechatAssetsApp } = await import("../../apps/relay/src/routes/wechat-assets.ts");

    const mockEnqueue = vi.fn().mockResolvedValue("nope");
    const app = createWechatAssetsApp({ enqueue: mockEnqueue });

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ invalid json",
    });

    expect(res.status).toBe(400);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it("accepts all four valid type values without error", async () => {
    const { createWechatAssetsApp } = await import("../../apps/relay/src/routes/wechat-assets.ts");

    const validTypes: WechatAssetUploadInput["type"][] = ["image", "voice", "video", "thumb"];

    for (const type of validTypes) {
      let jobId = 0;
      const mockEnqueue = vi.fn().mockResolvedValue(`job-${++jobId}`);
      const app = createWechatAssetsApp({ enqueue: mockEnqueue });

      const res = await app.request("/api/v1/wechat-assets/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageUrl: "https://example.com/asset.jpg", type }),
      });

      expect(res.status).toBe(200);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-002: Worker handler calls uploader.ts with server-held AppID/AppSecret
// ---------------------------------------------------------------------------

describe("AC-002: wechat-asset-upload worker handler — uses server-held credentials only", () => {
  it("handler calls credential-loader and passes credentials to uploader", async () => {
    const { createWechatAssetUploadHandler } = await import(
      "../../apps/job-worker/src/handlers/wechat-asset-upload.ts"
    );

    const mockCredentials = {
      appId: "wx_server_app_id",
      appSecret: "server_app_secret_value",
    };
    const mockLoadCredentials = vi.fn().mockResolvedValue(mockCredentials);
    const mockUpload = vi.fn().mockResolvedValue({
      mediaId: "media_001",
      url: "https://api.weixin.qq.com/...",
      type: "image" as const,
    });

    const handler = createWechatAssetUploadHandler({
      loadCredentials: mockLoadCredentials,
      upload: mockUpload,
    });

    await handler({
      data: {
        kind: "wechat-asset-upload",
        apiKeyId: "key-1",
        input: { imageUrl: "https://example.com/img.jpg", type: "image" },
      },
    } as never);

    expect(mockLoadCredentials).toHaveBeenCalledOnce();
    const uploadCall = mockUpload.mock.calls[0];
    expect(uploadCall).toBeDefined();
    // credentials passed to uploader must be from loader (server-held), not from job input
    const passedCredentials = uploadCall?.[1];
    expect(passedCredentials?.appId).toBe("wx_server_app_id");
    expect(passedCredentials?.appSecret).toBe("server_app_secret_value");
  });

  it("handler does NOT use any credentials from the job input data", async () => {
    const { createWechatAssetUploadHandler } = await import(
      "../../apps/job-worker/src/handlers/wechat-asset-upload.ts"
    );

    const serverCreds = { appId: "real-app-id", appSecret: "real-secret" };
    const mockLoadCredentials = vi.fn().mockResolvedValue(serverCreds);
    const uploadCalls: Array<unknown> = [];
    const mockUpload = vi.fn().mockImplementation(async (_input: unknown, creds: unknown) => {
      uploadCalls.push(creds);
      return { mediaId: "m1", url: "http://wx.url", type: "image" };
    });

    const handler = createWechatAssetUploadHandler({
      loadCredentials: mockLoadCredentials,
      upload: mockUpload,
    });

    // Job input contains attacker-supplied credentials — they must be ignored
    await handler({
      data: {
        kind: "wechat-asset-upload",
        apiKeyId: "key-1",
        input: {
          imageUrl: "https://example.com/img.jpg",
          type: "image",
          // These attacker-supplied fields must NOT reach the uploader
          appId: "attacker-app-id",
          appSecret: "attacker-secret",
        },
      },
    } as never);

    const usedCreds = uploadCalls[0] as { appId: string; appSecret: string } | undefined;
    expect(usedCreds?.appId).toBe("real-app-id");
    expect(usedCreds?.appSecret).toBe("real-secret");
    // The attacker credentials must not appear anywhere in the upload call
    expect(JSON.stringify(uploadCalls)).not.toContain("attacker-app-id");
    expect(JSON.stringify(uploadCalls)).not.toContain("attacker-secret");
  });
});

// ---------------------------------------------------------------------------
// AC-003: Job result shape and error code propagation
// ---------------------------------------------------------------------------

describe("AC-003: wechat-asset-upload job result and error shape", () => {
  it("successful upload returns result with mediaId, url, and type fields", async () => {
    const { createWechatAssetUploadHandler } = await import(
      "../../apps/job-worker/src/handlers/wechat-asset-upload.ts"
    );

    const expectedResult: WechatUploadResult = {
      mediaId: "media_id_xyz_789",
      url: "https://api.weixin.qq.com/cgi-bin/material/get_material",
      type: "image",
    };

    const handler = createWechatAssetUploadHandler({
      loadCredentials: vi.fn().mockResolvedValue({ appId: "id", appSecret: "sec" }),
      upload: vi.fn().mockResolvedValue(expectedResult),
    });

    const result = await handler({
      data: {
        kind: "wechat-asset-upload",
        apiKeyId: "key-1",
        input: { imageUrl: "https://example.com/img.jpg", type: "image" },
      },
    } as never);

    expect(result.mediaId).toBe("media_id_xyz_789");
    expect(result.url).toBe("https://api.weixin.qq.com/cgi-bin/material/get_material");
    expect(result.type).toBe("image");
  });

  it("result.type matches the type from job input", async () => {
    const { createWechatAssetUploadHandler } = await import(
      "../../apps/job-worker/src/handlers/wechat-asset-upload.ts"
    );

    const handler = createWechatAssetUploadHandler({
      loadCredentials: vi.fn().mockResolvedValue({ appId: "id", appSecret: "sec" }),
      upload: vi.fn().mockResolvedValue({
        mediaId: "thumb_media_id",
        url: "https://api.weixin.qq.com/thumb",
        type: "thumb",
      }),
    });

    const result = await handler({
      data: {
        kind: "wechat-asset-upload",
        apiKeyId: "key-1",
        input: { imageUrl: "https://example.com/thumb.jpg", type: "thumb" },
      },
    } as never);

    expect(result.type).toBe("thumb");
    expect(result.mediaId).toBeTruthy();
  });

  it("when WeChat API returns errcode, handler throws with error.code matching the errcode", async () => {
    const { createWechatAssetUploadHandler } = await import(
      "../../apps/job-worker/src/handlers/wechat-asset-upload.ts"
    );

    // Simulate a WeChat API error: errcode 40001 = invalid access token
    const wxError = new Error("WeChat API error");
    (wxError as Error & { code: string }).code = "40001";

    const handler = createWechatAssetUploadHandler({
      loadCredentials: vi.fn().mockResolvedValue({ appId: "id", appSecret: "sec" }),
      upload: vi.fn().mockRejectedValue(wxError),
    });

    const thrown = await handler({
      data: {
        kind: "wechat-asset-upload",
        apiKeyId: "key-1",
        input: { imageUrl: "https://example.com/img.jpg", type: "image" },
      },
    } as never).catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error & { code: string }).code).toBe("40001");
  });

  it("when WeChat API returns errcode 45009 (media count limit), error.code is '45009'", async () => {
    const { createWechatAssetUploadHandler } = await import(
      "../../apps/job-worker/src/handlers/wechat-asset-upload.ts"
    );

    const wxError = new Error("media count limit reached");
    (wxError as Error & { code: string }).code = "45009";

    const handler = createWechatAssetUploadHandler({
      loadCredentials: vi.fn().mockResolvedValue({ appId: "id", appSecret: "sec" }),
      upload: vi.fn().mockRejectedValue(wxError),
    });

    const thrown = await handler({
      data: {
        kind: "wechat-asset-upload",
        apiKeyId: "key-1",
        input: { imageUrl: "https://example.com/img.jpg", type: "image" },
      },
    } as never).catch((e: unknown) => e);

    expect((thrown as Error & { code: string }).code).toBe("45009");
  });
});

// ---------------------------------------------------------------------------
// AC-004: Full call path — credential-loader → uploader → media_id parse
// ---------------------------------------------------------------------------

describe("AC-004: wechat-asset uploader full call path with mocked WeChat HTTP response", () => {
  it("uploader calls /cgi-bin/material/add_material with correct access_token in URL", async () => {
    const { uploadWechatAsset } = await import("../../apps/relay/src/wechat-asset/uploader.ts");

    const capturedUrls: string[] = [];
    const mockHttpFetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrls.push(url);
      return {
        ok: true,
        json: async () => ({
          media_id: "fetched_media_id_001",
          type: "image",
          created_at: 1688000000,
        }),
      };
    });

    await uploadWechatAsset(
      { imageUrl: "https://example.com/photo.jpg", type: "image" },
      { appId: "wx_app_id_001", appSecret: "app_secret_001", accessToken: "access_token_abc" },
      { httpFetch: mockHttpFetch }
    );

    expect(capturedUrls).toHaveLength(1);
    expect(capturedUrls[0]).toContain("/cgi-bin/material/add_material");
    expect(capturedUrls[0]).toContain("access_token=access_token_abc");
  });

  it("uploader includes type parameter in the WeChat API request", async () => {
    const { uploadWechatAsset } = await import("../../apps/relay/src/wechat-asset/uploader.ts");

    const capturedUrls: string[] = [];
    const mockHttpFetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrls.push(url);
      return {
        ok: true,
        json: async () => ({ media_id: "m_thumb_001" }),
      };
    });

    await uploadWechatAsset(
      { imageUrl: "https://example.com/thumb.jpg", type: "thumb" },
      { appId: "wx_id", appSecret: "wx_sec", accessToken: "token_xyz" },
      { httpFetch: mockHttpFetch }
    );

    expect(capturedUrls[0]).toContain("type=thumb");
  });

  it("uploader extracts media_id from WeChat response and returns it in result.mediaId", async () => {
    const { uploadWechatAsset } = await import("../../apps/relay/src/wechat-asset/uploader.ts");

    const mockHttpFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        media_id: "returned_media_id_xyz",
        type: "image",
        created_at: 1688000000,
      }),
    });

    const result = await uploadWechatAsset(
      { imageUrl: "https://example.com/photo.jpg", type: "image" },
      { appId: "wx_id", appSecret: "wx_sec", accessToken: "token_123" },
      { httpFetch: mockHttpFetch }
    );

    expect(result.mediaId).toBe("returned_media_id_xyz");
  });

  it("uploader returns result.type matching the input type", async () => {
    const { uploadWechatAsset } = await import("../../apps/relay/src/wechat-asset/uploader.ts");

    const mockHttpFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ media_id: "voice_media_id", type: "voice" }),
    });

    const result = await uploadWechatAsset(
      { imageUrl: "https://example.com/audio.mp3", type: "voice" },
      { appId: "wx_id", appSecret: "wx_sec", accessToken: "token_456" },
      { httpFetch: mockHttpFetch }
    );

    expect(result.type).toBe("voice");
  });

  it("uploader throws error with WeChat errcode when API returns errcode != 0", async () => {
    const { uploadWechatAsset } = await import("../../apps/relay/src/wechat-asset/uploader.ts");

    const mockHttpFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ errcode: 40001, errmsg: "invalid credential" }),
    });

    await expect(
      uploadWechatAsset(
        { imageUrl: "https://example.com/photo.jpg", type: "image" },
        { appId: "wx_id", appSecret: "wx_sec", accessToken: "bad_token" },
        { httpFetch: mockHttpFetch }
      )
    ).rejects.toMatchObject({ code: "40001" });
  });

  it("uploader throws error with errcode 45009 on media count limit response", async () => {
    const { uploadWechatAsset } = await import("../../apps/relay/src/wechat-asset/uploader.ts");

    const mockHttpFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ errcode: 45009, errmsg: "reach max api daily quota limit" }),
    });

    await expect(
      uploadWechatAsset(
        { imageUrl: "https://example.com/photo.jpg", type: "image" },
        { appId: "wx_id", appSecret: "wx_sec", accessToken: "token_xxx" },
        { httpFetch: mockHttpFetch }
      )
    ).rejects.toMatchObject({ code: "45009" });
  });

  it("credential-loader reads WECHAT_APP_ID and WECHAT_APP_SECRET from env", async () => {
    const { loadWechatCredentials } = await import(
      "../../apps/relay/src/wechat-asset/credential-loader.ts"
    );

    const fakeEnv: Record<string, string> = {
      WECHAT_APP_ID: "wx_env_app_id",
      WECHAT_APP_SECRET: "wx_env_app_secret",
    };

    const creds = loadWechatCredentials(fakeEnv);

    expect(creds.appId).toBe("wx_env_app_id");
    expect(creds.appSecret).toBe("wx_env_app_secret");
  });

  it("credential-loader throws when WECHAT_APP_ID is absent", async () => {
    const { loadWechatCredentials } = await import(
      "../../apps/relay/src/wechat-asset/credential-loader.ts"
    );

    expect(() => loadWechatCredentials({ WECHAT_APP_SECRET: "secret-only" })).toThrow();
  });

  it("credential-loader throws when WECHAT_APP_SECRET is absent", async () => {
    const { loadWechatCredentials } = await import(
      "../../apps/relay/src/wechat-asset/credential-loader.ts"
    );

    expect(() => loadWechatCredentials({ WECHAT_APP_ID: "id-only" })).toThrow();
  });

  it("full pipeline: loadCredentials → uploadWechatAsset → mediaId extracted (AC-004 integrated mock)", async () => {
    const { loadWechatCredentials } = await import(
      "../../apps/relay/src/wechat-asset/credential-loader.ts"
    );
    const { uploadWechatAsset } = await import("../../apps/relay/src/wechat-asset/uploader.ts");

    // Step 1: load credentials from env
    const creds = loadWechatCredentials({
      WECHAT_APP_ID: "full_pipeline_app_id",
      WECHAT_APP_SECRET: "full_pipeline_secret",
    });

    // Step 2: mock WeChat HTTP call returning { media_id: "..." }
    const mockHttpFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        media_id: "pipeline_media_id_abc",
        type: "image",
        created_at: 1688000000,
      }),
    });

    // Step 3: call uploader (simulates what worker does)
    const result = await uploadWechatAsset(
      { imageUrl: "https://example.com/pipeline.jpg", type: "image" },
      { appId: creds.appId, appSecret: creds.appSecret, accessToken: "mock_token" },
      { httpFetch: mockHttpFetch }
    );

    // Step 4: assert complete call path produced correct mediaId
    expect(creds.appId).toBe("full_pipeline_app_id");
    expect(mockHttpFetch).toHaveBeenCalledOnce();
    expect(result.mediaId).toBe("pipeline_media_id_abc");
    expect(result.type).toBe("image");
  });
});
