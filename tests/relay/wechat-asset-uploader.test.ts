/**
 * T-126 AC-007~008 — wechat-asset uploader: imageUrl download + multipart upload + url from body.
 *
 * Rewrites the T-077 uploader tests to match the new T-126 uploader behavior:
 *   - AC-007 (R-001): result.url = WeChat response body.url (not the API URL containing access_token)
 *   - AC-008: uploader first downloads imageUrl (PNG bytes), then uploads via multipart/form-data
 *
 * All tests in this file must FAIL until the uploader is rewritten to:
 *   1. Download imageUrl as binary data
 *   2. Build a multipart/form-data request to the WeChat material API
 *   3. Return result.url = response body.url (not apiUrl)
 *
 * Legacy T-077 tests that asserted `url: apiUrl` (i.e. url containing access_token) are replaced
 * with correct behavior assertions.
 */

import { describe, expect, it, vi } from "vitest";
import { uploadWechatAsset } from "../../apps/relay/src/wechat-asset/uploader.ts";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const FAKE_PNG_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG magic bytes

const MOCK_CREDS = {
  appId: "wx_app_id_001",
  appSecret: "app_secret_001",
  accessToken: "mock-access-token-xyz",
};

// ---------------------------------------------------------------------------
// AC-007 (R-001): result.url must come from WeChat response body.url, not the API URL
// ---------------------------------------------------------------------------

describe("AC-007 (R-001): uploader result.url = WeChat response body.url (not access_token URL)", () => {
  it("result.url equals the url from WeChat response body, not the API request URL", async () => {
    const wechatBodyUrl = "https://wechat-cdn.example.com/media/abc123";
    const capturedRequestUrls: string[] = [];

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      capturedRequestUrls.push(url);
      if (!url.includes("api.weixin.qq.com")) {
        // imageUrl download
        return {
          ok: true,
          arrayBuffer: async () => FAKE_PNG_BYTES.buffer,
          json: async () => {
            throw new Error("not JSON");
          },
        };
      }
      // WeChat material API response
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(0),
        json: async () => ({ media_id: "media_abc123", url: wechatBodyUrl }),
      };
    });

    const result = await uploadWechatAsset(
      { imageUrl: "https://cdn.example.com/img.png", type: "image" },
      MOCK_CREDS,
      { httpFetch: mockFetch }
    );

    // R-001: result.url must be body.url from WeChat, not the apiUrl (which contains access_token)
    expect(result.url).toBe(wechatBodyUrl);
    expect(result.url).not.toContain("access_token");
    expect(result.url).not.toContain("mock-access-token-xyz");
  });

  it("result.url does not contain the access_token parameter even if token is in creds", async () => {
    const secretToken = "super-secret-access-token-do-not-leak";
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (!url.includes("api.weixin.qq.com")) {
        return {
          ok: true,
          arrayBuffer: async () => FAKE_PNG_BYTES.buffer,
          json: async () => {
            throw new Error("not JSON");
          },
        };
      }
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(0),
        json: async () => ({
          media_id: "m_001",
          url: "https://wechat-cdn.example.com/media/xyz",
        }),
      };
    });

    const result = await uploadWechatAsset(
      { imageUrl: "https://example.com/photo.jpg", type: "image" },
      { appId: "wx_id", appSecret: "wx_sec", accessToken: secretToken },
      { httpFetch: mockFetch }
    );

    expect(result.url).not.toContain(secretToken);
    expect(result.url).toBe("https://wechat-cdn.example.com/media/xyz");
  });

  it("result.mediaId comes from WeChat response body media_id", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (!url.includes("api.weixin.qq.com")) {
        return {
          ok: true,
          arrayBuffer: async () => FAKE_PNG_BYTES.buffer,
          json: async () => {
            throw new Error("not JSON");
          },
        };
      }
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(0),
        json: async () => ({
          media_id: "confirmed_media_id_999",
          url: "https://wechat-cdn.example.com/media/999",
        }),
      };
    });

    const result = await uploadWechatAsset(
      { imageUrl: "https://cdn.example.com/img.png", type: "image" },
      MOCK_CREDS,
      { httpFetch: mockFetch }
    );

    expect(result.mediaId).toBe("confirmed_media_id_999");
  });

  it("result.type matches the input type", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (!url.includes("api.weixin.qq.com")) {
        return {
          ok: true,
          arrayBuffer: async () => FAKE_PNG_BYTES.buffer,
          json: async () => {
            throw new Error("not JSON");
          },
        };
      }
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(0),
        json: async () => ({
          media_id: "thumb_media",
          url: "https://wechat-cdn.example.com/thumb/t1",
        }),
      };
    });

    const result = await uploadWechatAsset(
      { imageUrl: "https://cdn.example.com/thumb.jpg", type: "thumb" },
      MOCK_CREDS,
      { httpFetch: mockFetch }
    );

    expect(result.type).toBe("thumb");
  });
});

// ---------------------------------------------------------------------------
// AC-008: uploader downloads imageUrl first, then uploads via multipart/form-data
// ---------------------------------------------------------------------------

describe("AC-008: uploader downloads imageUrl bytes then constructs multipart/form-data to WeChat API", () => {
  it("makes two fetch calls: first to imageUrl, second to WeChat API", async () => {
    const fetchCalls: string[] = [];
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      fetchCalls.push(url);
      if (!url.includes("api.weixin.qq.com")) {
        return {
          ok: true,
          arrayBuffer: async () => FAKE_PNG_BYTES.buffer,
          json: async () => {
            throw new Error("not JSON");
          },
        };
      }
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(0),
        json: async () => ({ media_id: "m1", url: "https://wechat-cdn.example.com/media/m1" }),
      };
    });

    await uploadWechatAsset(
      { imageUrl: "https://cdn.example.com/img.png", type: "image" },
      MOCK_CREDS,
      { httpFetch: mockFetch }
    );

    // Two fetches must happen: one download (imageUrl), one upload (WeChat API)
    expect(fetchCalls).toHaveLength(2);
    expect(fetchCalls[0]).toBe("https://cdn.example.com/img.png");
    expect(fetchCalls[1]).toContain("api.weixin.qq.com");
    expect(fetchCalls[1]).toContain("/cgi-bin/material/add_material");
  });

  it("WeChat API request Content-Type contains multipart/form-data", async () => {
    const capturedInits: RequestInit[] = [];
    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (!url.includes("api.weixin.qq.com")) {
        return {
          ok: true,
          arrayBuffer: async () => FAKE_PNG_BYTES.buffer,
          json: async () => {
            throw new Error("not JSON");
          },
        };
      }
      if (init) capturedInits.push(init);
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(0),
        json: async () => ({ media_id: "m2", url: "https://wechat-cdn.example.com/media/m2" }),
      };
    });

    await uploadWechatAsset(
      { imageUrl: "https://cdn.example.com/img.png", type: "image" },
      MOCK_CREDS,
      { httpFetch: mockFetch }
    );

    expect(capturedInits).toHaveLength(1);
    const wechatInit = capturedInits[0];
    expect(wechatInit).toBeDefined();

    // The body sent to WeChat must be a FormData (multipart), not a plain string or JSON
    // Either: the body is a FormData instance, or Content-Type header contains "multipart/form-data"
    const bodyIsFormData = wechatInit?.body instanceof FormData;
    const contentTypeIsMultipart =
      typeof wechatInit?.headers === "object" &&
      JSON.stringify(wechatInit.headers).toLowerCase().includes("multipart/form-data");

    // At minimum one of these must be true — FormData body is the canonical check
    expect(bodyIsFormData || contentTypeIsMultipart).toBe(true);
  });

  it("WeChat API request method is POST", async () => {
    const capturedInits: RequestInit[] = [];
    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (!url.includes("api.weixin.qq.com")) {
        return {
          ok: true,
          arrayBuffer: async () => FAKE_PNG_BYTES.buffer,
          json: async () => {
            throw new Error("not JSON");
          },
        };
      }
      if (init) capturedInits.push(init);
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(0),
        json: async () => ({ media_id: "m3", url: "https://wechat-cdn.example.com/media/m3" }),
      };
    });

    await uploadWechatAsset(
      { imageUrl: "https://cdn.example.com/img.png", type: "image" },
      MOCK_CREDS,
      { httpFetch: mockFetch }
    );

    const wechatInit = capturedInits[0];
    expect(wechatInit?.method?.toUpperCase()).toBe("POST");
  });

  it("WeChat API URL contains access_token from creds (token is in URL query, not in result)", async () => {
    const capturedWechatUrls: string[] = [];
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (!url.includes("api.weixin.qq.com")) {
        return {
          ok: true,
          arrayBuffer: async () => FAKE_PNG_BYTES.buffer,
          json: async () => {
            throw new Error("not JSON");
          },
        };
      }
      capturedWechatUrls.push(url);
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(0),
        json: async () => ({ media_id: "m4", url: "https://wechat-cdn.example.com/media/m4" }),
      };
    });

    await uploadWechatAsset(
      { imageUrl: "https://cdn.example.com/img.png", type: "image" },
      { appId: "wx_app", appSecret: "wx_sec", accessToken: "test-token-for-url" },
      { httpFetch: mockFetch }
    );

    expect(capturedWechatUrls).toHaveLength(1);
    expect(capturedWechatUrls[0]).toContain("access_token=test-token-for-url");
    expect(capturedWechatUrls[0]).toContain("type=image");
  });

  it("download fetch is called with the exact imageUrl from input", async () => {
    const imageUrl = "https://cdn.example.com/specific-image-path.png";
    const downloadedUrls: string[] = [];

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (!url.includes("api.weixin.qq.com")) {
        downloadedUrls.push(url);
        return {
          ok: true,
          arrayBuffer: async () => FAKE_PNG_BYTES.buffer,
          json: async () => {
            throw new Error("not JSON");
          },
        };
      }
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(0),
        json: async () => ({ media_id: "m5", url: "https://wechat-cdn.example.com/media/m5" }),
      };
    });

    await uploadWechatAsset({ imageUrl, type: "image" }, MOCK_CREDS, { httpFetch: mockFetch });

    expect(downloadedUrls).toHaveLength(1);
    expect(downloadedUrls[0]).toBe(imageUrl);
  });
});

// ---------------------------------------------------------------------------
// R-004: uploader checks imageUrl download response ok — throws on non-2xx
// ---------------------------------------------------------------------------

describe("R-004: uploader throws when imageUrl download returns non-2xx status", () => {
  it("throws with HTTP 404 message when imageUrl download returns 404", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (!url.includes("api.weixin.qq.com")) {
        return {
          ok: false,
          status: 404,
          arrayBuffer: async () => new ArrayBuffer(0),
          json: async () => ({}),
        };
      }
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(0),
        json: async () => ({ media_id: "m", url: "https://cdn.example.com/m" }),
      };
    });

    await expect(
      uploadWechatAsset(
        { imageUrl: "https://cdn.example.com/missing.png", type: "image" },
        MOCK_CREDS,
        { httpFetch: mockFetch }
      )
    ).rejects.toThrow("404");
  });

  it("throws with HTTP 403 message when imageUrl download returns 403", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (!url.includes("api.weixin.qq.com")) {
        return {
          ok: false,
          status: 403,
          arrayBuffer: async () => new ArrayBuffer(0),
          json: async () => ({}),
        };
      }
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(0),
        json: async () => ({ media_id: "m", url: "https://cdn.example.com/m" }),
      };
    });

    await expect(
      uploadWechatAsset(
        { imageUrl: "https://cdn.example.com/forbidden.png", type: "image" },
        MOCK_CREDS,
        { httpFetch: mockFetch }
      )
    ).rejects.toThrow("403");
  });
});

// ---------------------------------------------------------------------------
// Error propagation — WeChat API errcode still throws (behavior preserved from T-077)
// ---------------------------------------------------------------------------

describe("uploader error propagation: WeChat API errcode throws with error.code", () => {
  it("throws error with code '40001' when WeChat returns errcode 40001", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (!url.includes("api.weixin.qq.com")) {
        return {
          ok: true,
          arrayBuffer: async () => FAKE_PNG_BYTES.buffer,
          json: async () => {
            throw new Error("not JSON");
          },
        };
      }
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(0),
        json: async () => ({ errcode: 40001, errmsg: "invalid credential" }),
      };
    });

    await expect(
      uploadWechatAsset(
        { imageUrl: "https://cdn.example.com/img.png", type: "image" },
        MOCK_CREDS,
        { httpFetch: mockFetch }
      )
    ).rejects.toMatchObject({ code: "40001" });
  });

  it("throws error with code '45009' on media count limit response", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (!url.includes("api.weixin.qq.com")) {
        return {
          ok: true,
          arrayBuffer: async () => FAKE_PNG_BYTES.buffer,
          json: async () => {
            throw new Error("not JSON");
          },
        };
      }
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(0),
        json: async () => ({ errcode: 45009, errmsg: "reach max api daily quota limit" }),
      };
    });

    await expect(
      uploadWechatAsset(
        { imageUrl: "https://cdn.example.com/img.png", type: "image" },
        MOCK_CREDS,
        { httpFetch: mockFetch }
      )
    ).rejects.toMatchObject({ code: "45009" });
  });
});

// ---------------------------------------------------------------------------
// Credential loader (kept from T-077, no behavior change)
// ---------------------------------------------------------------------------

describe("credential-loader: reads WECHAT_APP_ID / WECHAT_APP_SECRET from env", () => {
  it("returns appId and appSecret from env", async () => {
    const { loadWechatCredentials } = await import(
      "../../apps/relay/src/wechat-asset/credential-loader.ts"
    );

    const creds = loadWechatCredentials({
      WECHAT_APP_ID: "wx_env_app_id",
      WECHAT_APP_SECRET: "wx_env_app_secret",
    });

    expect(creds.appId).toBe("wx_env_app_id");
    expect(creds.appSecret).toBe("wx_env_app_secret");
  });

  it("throws when WECHAT_APP_ID is absent", async () => {
    const { loadWechatCredentials } = await import(
      "../../apps/relay/src/wechat-asset/credential-loader.ts"
    );
    expect(() => loadWechatCredentials({ WECHAT_APP_SECRET: "secret-only" })).toThrow();
  });

  it("throws when WECHAT_APP_SECRET is absent", async () => {
    const { loadWechatCredentials } = await import(
      "../../apps/relay/src/wechat-asset/credential-loader.ts"
    );
    expect(() => loadWechatCredentials({ WECHAT_APP_ID: "id-only" })).toThrow();
  });
});
