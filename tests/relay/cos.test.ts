import { describe, expect, it } from "vitest";
import { createCosAdapter } from "../../apps/relay/src/image-host/cos.ts";
import type { HttpRequest, HttpRequestInit } from "../../apps/relay/src/image-host/http.ts";

const testConfig = {
  secretId: "test-secret-id",
  secretKey: "test-secret-key",
  bucket: "my-bucket-1250000000",
  region: "ap-guangzhou",
};

function makeHttpRequest(override?: Partial<{ ok: boolean; status: number }>): {
  httpRequest: HttpRequest;
  calls: Array<{ url: string; init: HttpRequestInit }>;
} {
  const calls: Array<{ url: string; init: HttpRequestInit }> = [];
  const httpRequest: HttpRequest = async (url, init) => {
    calls.push({ url, init });
    const ok = override?.ok ?? true;
    const status = override?.status ?? 200;
    return {
      ok,
      status,
      json: async () => ({}),
      text: async () => "",
    };
  };
  return { httpRequest, calls };
}

describe("createCosAdapter", () => {
  it("uses PUT method", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const adapter = createCosAdapter(testConfig, { httpRequest });
    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "photo.jpg",
      contentType: "image/jpeg",
    });
    expect(calls[0]?.init.method).toBe("PUT");
  });

  it("uploads to the bucket.cos.region.myqcloud.com host", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const adapter = createCosAdapter(testConfig, { httpRequest });
    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "photo.jpg",
      contentType: "image/jpeg",
    });
    expect(calls[0]?.url).toContain("my-bucket-1250000000.cos.ap-guangzhou.myqcloud.com");
  });

  it("Authorization header contains q-sign-algorithm=sha1", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const adapter = createCosAdapter(testConfig, { httpRequest });
    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "photo.jpg",
      contentType: "image/jpeg",
    });
    expect(calls[0]?.init.headers?.Authorization).toContain("q-sign-algorithm=sha1");
  });

  it("Authorization header contains q-ak with the configured secretId", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const adapter = createCosAdapter(testConfig, { httpRequest });
    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "photo.jpg",
      contentType: "image/jpeg",
    });
    expect(calls[0]?.init.headers?.Authorization).toContain(`q-ak=${testConfig.secretId}`);
  });

  it("Authorization header contains q-signature field", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const adapter = createCosAdapter(testConfig, { httpRequest });
    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "photo.jpg",
      contentType: "image/jpeg",
    });
    expect(calls[0]?.init.headers?.Authorization).toContain("q-signature=");
  });

  it("returned url uses default myqcloud domain when no custom domain is set", async () => {
    const { httpRequest } = makeHttpRequest();
    const adapter = createCosAdapter(testConfig, { httpRequest });
    const result = await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "photo.jpg",
      contentType: "image/jpeg",
    });
    expect(result.url).toContain("my-bucket-1250000000.cos.ap-guangzhou.myqcloud.com");
  });

  it("returned url uses custom domain when configured", async () => {
    const { httpRequest } = makeHttpRequest();
    const adapter = createCosAdapter(
      { ...testConfig, domain: "https://cdn.mysite.com" },
      { httpRequest }
    );
    const result = await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "photo.jpg",
      contentType: "image/jpeg",
    });
    expect(result.url.startsWith("https://cdn.mysite.com/")).toBe(true);
  });

  it("throws when ok is false", async () => {
    const { httpRequest } = makeHttpRequest({ ok: false, status: 403 });
    const adapter = createCosAdapter(testConfig, { httpRequest });
    await expect(
      adapter.upload(new Uint8Array([1, 2, 3]), {
        filename: "photo.jpg",
        contentType: "image/jpeg",
      })
    ).rejects.toThrow();
  });

  it("adapter name is 'cos'", () => {
    const adapter = createCosAdapter(testConfig);
    expect(adapter.name).toBe("cos");
  });

  it("upload with empty filename falls back to upload_<timestamp> key (non-empty)", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const adapter = createCosAdapter(testConfig, { httpRequest });
    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "",
      contentType: "image/jpeg",
    });
    const urlPath = new URL(calls[0]?.url ?? "").pathname;
    expect(urlPath.length).toBeGreaterThan(1);
    expect(urlPath).toMatch(/^\/upload_\d+$/);
  });

  it("upload with domain config uses domain in returned URL", async () => {
    const { httpRequest } = makeHttpRequest();
    const adapter = createCosAdapter(
      { ...testConfig, domain: "https://cdn.custom.com" },
      { httpRequest }
    );
    const result = await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "img.jpg",
      contentType: "image/jpeg",
    });
    expect(result.url.startsWith("https://cdn.custom.com/")).toBe(true);
  });
});
