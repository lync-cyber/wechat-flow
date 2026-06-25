import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { HttpRequest, HttpRequestInit } from "../../apps/relay/src/image-host/http.ts";
import { sanitizeObjectKey } from "../../apps/relay/src/image-host/keys.ts";
import { createOssAdapter } from "../../apps/relay/src/image-host/oss.ts";

const testConfig = {
  accessKeyId: "test-access-key-id",
  accessKeySecret: "test-access-key-secret",
  bucket: "my-bucket",
  region: "oss-cn-hangzhou",
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

describe("createOssAdapter", () => {
  it("uses PUT method", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const adapter = createOssAdapter(testConfig, { httpRequest });
    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "photo.jpg",
      contentType: "image/jpeg",
    });
    expect(calls[0]?.init.method).toBe("PUT");
  });

  it("uploads to the bucket.region.aliyuncs.com host", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const adapter = createOssAdapter(testConfig, { httpRequest });
    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "photo.jpg",
      contentType: "image/jpeg",
    });
    expect(calls[0]?.url).toContain("my-bucket.oss-cn-hangzhou.aliyuncs.com");
  });

  it("Authorization header starts with 'OSS '", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const adapter = createOssAdapter(testConfig, { httpRequest });
    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "photo.jpg",
      contentType: "image/jpeg",
    });
    expect(calls[0]?.init.headers?.Authorization).toMatch(/^OSS /);
  });

  it("Authorization header contains the accessKeyId", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const adapter = createOssAdapter(testConfig, { httpRequest });
    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "photo.jpg",
      contentType: "image/jpeg",
    });
    expect(calls[0]?.init.headers?.Authorization).toContain(testConfig.accessKeyId);
  });

  it("sets Content-Type header to the upload meta contentType", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const adapter = createOssAdapter(testConfig, { httpRequest });
    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "photo.jpg",
      contentType: "image/jpeg",
    });
    expect(calls[0]?.init.headers?.["Content-Type"]).toBe("image/jpeg");
  });

  it("sets Date header in the request", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const adapter = createOssAdapter(testConfig, { httpRequest });
    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "photo.jpg",
      contentType: "image/jpeg",
    });
    expect(calls[0]?.init.headers?.Date).toBeDefined();
  });

  it("Authorization is a correct OSS signature over method, content-type, date and resource", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const fixedDate = new Date("2026-01-02T03:04:05Z");
    const adapter = createOssAdapter(testConfig, { httpRequest, now: () => fixedDate });
    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "photo.jpg",
      contentType: "image/jpeg",
    });

    const key = sanitizeObjectKey("photo.jpg");
    const stringToSign = `PUT\n\nimage/jpeg\n${fixedDate.toUTCString()}\n/${testConfig.bucket}/${key}`;
    const expectedSig = createHmac("sha1", testConfig.accessKeySecret)
      .update(stringToSign)
      .digest("base64");
    expect(calls[0]?.init.headers?.Authorization).toBe(
      `OSS ${testConfig.accessKeyId}:${expectedSig}`
    );
  });

  it("signature changes when content-type changes (content-type is part of the signature)", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const fixedDate = new Date("2026-01-02T03:04:05Z");
    const adapter = createOssAdapter(testConfig, { httpRequest, now: () => fixedDate });
    await adapter.upload(new Uint8Array([1]), { filename: "a.jpg", contentType: "image/jpeg" });
    await adapter.upload(new Uint8Array([1]), { filename: "a.jpg", contentType: "image/png" });
    expect(calls[0]?.init.headers?.Authorization).not.toBe(calls[1]?.init.headers?.Authorization);
  });

  it("returned url uses default aliyuncs domain when no custom domain is set", async () => {
    const { httpRequest } = makeHttpRequest();
    const adapter = createOssAdapter(testConfig, { httpRequest });
    const result = await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "photo.jpg",
      contentType: "image/jpeg",
    });
    expect(result.url).toContain("my-bucket.oss-cn-hangzhou.aliyuncs.com");
  });

  it("returned url uses custom domain when configured", async () => {
    const { httpRequest } = makeHttpRequest();
    const adapter = createOssAdapter(
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
    const adapter = createOssAdapter(testConfig, { httpRequest });
    await expect(
      adapter.upload(new Uint8Array([1, 2, 3]), {
        filename: "photo.jpg",
        contentType: "image/jpeg",
      })
    ).rejects.toThrow();
  });

  it("adapter name is 'oss'", () => {
    const adapter = createOssAdapter(testConfig);
    expect(adapter.name).toBe("oss");
  });

  it("upload with empty filename falls back to upload_<timestamp> key (non-empty)", async () => {
    const { httpRequest, calls } = makeHttpRequest();
    const adapter = createOssAdapter(testConfig, { httpRequest });
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
    const adapter = createOssAdapter(
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
