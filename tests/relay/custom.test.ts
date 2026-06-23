import { describe, expect, it } from "vitest";
import { createCustomAdapter } from "../../apps/relay/src/image-host/custom.ts";
import type { HttpRequest, HttpRequestInit } from "../../apps/relay/src/image-host/http.ts";

const testConfig = {
  endpoint: "https://upload.example.com/api/upload",
  token: "bearer-token-123",
};

function makeHttpRequest(override?: Partial<{ ok: boolean; status: number; body: unknown }>): {
  httpRequest: HttpRequest;
  calls: Array<{ url: string; init: HttpRequestInit }>;
} {
  const calls: Array<{ url: string; init: HttpRequestInit }> = [];
  const httpRequest: HttpRequest = async (url, init) => {
    calls.push({ url, init });
    const ok = override?.ok ?? true;
    const status = override?.status ?? 200;
    const body = override?.body ?? { url: "https://upload.example.com/files/img.jpg" };
    return {
      ok,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  };
  return { httpRequest, calls };
}

describe("createCustomAdapter", () => {
  it("posts to the configured endpoint", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const adapter = createCustomAdapter(testConfig, { httpRequest });
    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "img.jpg",
      contentType: "image/jpeg",
    });
    expect(calls[0]?.url).toBe(testConfig.endpoint);
  });

  it("uses POST method", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const adapter = createCustomAdapter(testConfig, { httpRequest });
    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "img.jpg",
      contentType: "image/jpeg",
    });
    expect(calls[0]?.init.method).toBe("POST");
  });

  it("sets Authorization: Bearer <token> when token is provided", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const adapter = createCustomAdapter(testConfig, { httpRequest });
    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "img.jpg",
      contentType: "image/jpeg",
    });
    expect(calls[0]?.init.headers?.Authorization).toBe("Bearer bearer-token-123");
  });

  it("omits Authorization header when token is absent", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const adapter = createCustomAdapter({ endpoint: testConfig.endpoint }, { httpRequest });
    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "img.jpg",
      contentType: "image/jpeg",
    });
    expect(calls[0]?.init.headers?.Authorization).toBeUndefined();
  });

  it("returns url from the default 'url' field", async () => {
    const { httpRequest } = makeHttpRequest({
      body: { url: "https://cdn.example.com/result.jpg" },
    });
    const adapter = createCustomAdapter(testConfig, { httpRequest });
    const result = await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "img.jpg",
      contentType: "image/jpeg",
    });
    expect(result.url).toBe("https://cdn.example.com/result.jpg");
  });

  it("returns url from a custom responseUrlField", async () => {
    const { httpRequest } = makeHttpRequest({
      body: { link: "https://cdn.example.com/photo.jpg" },
    });
    const adapter = createCustomAdapter(
      { endpoint: testConfig.endpoint, responseUrlField: "link" },
      { httpRequest }
    );
    const result = await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "img.jpg",
      contentType: "image/jpeg",
    });
    expect(result.url).toBe("https://cdn.example.com/photo.jpg");
  });

  it("throws when ok is false", async () => {
    const { httpRequest } = makeHttpRequest({
      ok: false,
      status: 403,
      body: { error: "forbidden" },
    });
    const adapter = createCustomAdapter(testConfig, { httpRequest });
    await expect(
      adapter.upload(new Uint8Array([1, 2, 3]), { filename: "img.jpg", contentType: "image/jpeg" })
    ).rejects.toThrow();
  });

  it("throws when response is missing the url field", async () => {
    const { httpRequest } = makeHttpRequest({ body: { something: "else" } });
    const adapter = createCustomAdapter(testConfig, { httpRequest });
    await expect(
      adapter.upload(new Uint8Array([1, 2, 3]), { filename: "img.jpg", contentType: "image/jpeg" })
    ).rejects.toThrow();
  });

  it("adapter name is 'custom'", () => {
    const adapter = createCustomAdapter(testConfig);
    expect(adapter.name).toBe("custom");
  });
});
