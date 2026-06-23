import { describe, expect, it } from "vitest";
import type { HttpPost } from "../../apps/relay/src/image-host/qiniu.ts";
import { createQiniuAdapter } from "../../apps/relay/src/image-host/qiniu.ts";

const testConfig = {
  accessKey: "test-access-key",
  secretKey: "test-secret-key",
  bucket: "test-bucket",
  domain: "https://cdn.example.com",
};

function makeHttpPost(responseKey?: string): {
  httpPost: HttpPost;
  calls: Array<{ url: string; formData: FormData }>;
} {
  const calls: Array<{ url: string; formData: FormData }> = [];
  const httpPost: HttpPost = async (url, formData) => {
    calls.push({ url, formData });
    const key = responseKey ?? "test-file.jpg";
    return {
      ok: true,
      json: async () => ({ key }),
    };
  };
  return { httpPost, calls };
}

describe("createQiniuAdapter: upload token format", () => {
  it("upload token has three segments separated by colons (ak:sign:policy)", async () => {
    const { httpPost, calls } = makeHttpPost();
    const adapter = createQiniuAdapter(testConfig, { httpPost });

    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "test.jpg",
      contentType: "image/jpeg",
    });

    const form = calls[0]?.formData;
    expect(form).toBeDefined();
    const token = form?.get("token") as string;
    const segments = token.split(":");
    expect(segments).toHaveLength(3);
  });

  it("first segment of upload token equals the accessKey", async () => {
    const { httpPost, calls } = makeHttpPost();
    const adapter = createQiniuAdapter(testConfig, { httpPost });

    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "test.jpg",
      contentType: "image/jpeg",
    });

    const token = calls[0]?.formData.get("token") as string;
    const [ak] = token.split(":");
    expect(ak).toBe(testConfig.accessKey);
  });

  it("uploads to the qiniu upload endpoint", async () => {
    const { httpPost, calls } = makeHttpPost();
    const adapter = createQiniuAdapter(testConfig, { httpPost });

    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "test.jpg",
      contentType: "image/jpeg",
    });

    expect(calls[0]?.url).toBe("https://up.qiniup.com");
  });

  it("key in multipart form matches the provided filename", async () => {
    const { httpPost, calls } = makeHttpPost();
    const adapter = createQiniuAdapter(testConfig, { httpPost });

    await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "my-photo.jpg",
      contentType: "image/jpeg",
    });

    const key = calls[0]?.formData.get("key") as string;
    expect(key).toBe("my-photo.jpg");
  });

  it("returned url starts with the configured domain", async () => {
    const { httpPost } = makeHttpPost("my-photo.jpg");
    const adapter = createQiniuAdapter(testConfig, { httpPost });

    const result = await adapter.upload(new Uint8Array([1, 2, 3]), {
      filename: "my-photo.jpg",
      contentType: "image/jpeg",
    });

    expect(result.url.startsWith(testConfig.domain)).toBe(true);
  });

  it("throws when the upload endpoint responds with ok: false", async () => {
    const httpPost: HttpPost = async () => ({
      ok: false,
      json: async () => ({ error: "bad token" }),
    });
    const adapter = createQiniuAdapter(testConfig, { httpPost });

    await expect(
      adapter.upload(new Uint8Array([1, 2, 3]), { filename: "x.jpg", contentType: "image/jpeg" })
    ).rejects.toThrow();
  });
});
