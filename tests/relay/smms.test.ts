import { describe, expect, it } from "vitest";
import type { HttpRequest, HttpRequestInit } from "../../apps/relay/src/image-host/http.ts";
import { createSmmsAdapter } from "../../apps/relay/src/image-host/smms.ts";

const testConfig = { token: "test-smms-token" };

function makeHttpRequest(override?: Partial<{ ok: boolean; status: number; body: unknown }>): {
  httpRequest: HttpRequest;
  calls: Array<{ url: string; init: HttpRequestInit }>;
} {
  const calls: Array<{ url: string; init: HttpRequestInit }> = [];
  const httpRequest: HttpRequest = async (url, init) => {
    calls.push({ url, init });
    const ok = override?.ok ?? true;
    const status = override?.status ?? 200;
    const body = override?.body ?? {
      success: true,
      data: { url: "https://sm.ms/images/test.jpg" },
    };
    return {
      ok,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  };
  return { httpRequest, calls };
}

describe("createSmmsAdapter", () => {
  it("posts to https://sm.ms/api/v2/upload", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const adapter = createSmmsAdapter(testConfig, { httpRequest });
    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "a.jpg",
      contentType: "image/jpeg",
    });
    expect(calls[0]?.url).toBe("https://sm.ms/api/v2/upload");
  });

  it("uses POST method", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const adapter = createSmmsAdapter(testConfig, { httpRequest });
    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "a.jpg",
      contentType: "image/jpeg",
    });
    expect(calls[0]?.init.method).toBe("POST");
  });

  it("sets Authorization header to the configured token", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const adapter = createSmmsAdapter(testConfig, { httpRequest });
    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "a.jpg",
      contentType: "image/jpeg",
    });
    expect(calls[0]?.init.headers?.Authorization).toBe(testConfig.token);
  });

  it("returns url from success response data.url", async () => {
    const { httpRequest } = makeHttpRequest({
      body: { success: true, data: { url: "https://sm.ms/images/photo.jpg" } },
    });
    const adapter = createSmmsAdapter(testConfig, { httpRequest });
    const result = await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "a.jpg",
      contentType: "image/jpeg",
    });
    expect(result.url).toBe("https://sm.ms/images/photo.jpg");
  });

  it("returns url from images field when code is image_repeated", async () => {
    const { httpRequest } = makeHttpRequest({
      body: { success: false, code: "image_repeated", images: "https://sm.ms/images/dup.jpg" },
    });
    const adapter = createSmmsAdapter(testConfig, { httpRequest });
    const result = await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "a.jpg",
      contentType: "image/jpeg",
    });
    expect(result.url).toBe("https://sm.ms/images/dup.jpg");
  });

  it("throws when ok is false", async () => {
    const { httpRequest } = makeHttpRequest({
      ok: false,
      status: 401,
      body: { message: "Unauthorized" },
    });
    const adapter = createSmmsAdapter(testConfig, { httpRequest });
    await expect(
      adapter.upload(new Uint8Array([1, 2, 3]), { filename: "a.jpg", contentType: "image/jpeg" })
    ).rejects.toThrow();
  });

  it("adapter name is 'smms'", () => {
    const adapter = createSmmsAdapter(testConfig);
    expect(adapter.name).toBe("smms");
  });
});
