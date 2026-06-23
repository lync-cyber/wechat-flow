import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLocalAdapter } from "../../apps/relay/src/image-host/local.ts";
import type {
  ImageHostAdapter,
  UploadMeta,
  UploadResult,
} from "../../apps/relay/src/image-host/types.ts";
import { createApp } from "../../apps/relay/src/index.ts";
import { createImagesApp } from "../../apps/relay/src/routes/images.ts";

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

/** Minimal valid JPEG buffer (1×1 px at quality 80). */
async function makeMinimalJpeg(): Promise<Uint8Array> {
  const buf = await sharp({
    create: { width: 1, height: 1, channels: 3, background: { r: 128, g: 128, b: 128 } },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
  return Uint8Array.from(buf);
}

/** Wraps bytes in a Blob backed by a fresh ArrayBuffer (avoids Buffer/SharedArrayBuffer typing friction). */
function imageBlob(bytes: Uint8Array): Blob {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return new Blob([ab], { type: "image/jpeg" });
}

/**
 * Spy adapter: records every upload call for later assertion.
 * Returns a predictable URL built from publicBaseUrl + filename.
 */
function makeSpyAdapter(publicBaseUrl = "https://cdn.test"): ImageHostAdapter & {
  calls: Array<{ data: Uint8Array; meta: UploadMeta }>;
} {
  const calls: Array<{ data: Uint8Array; meta: UploadMeta }> = [];
  return {
    name: "spy",
    calls,
    upload(data: Uint8Array, meta: UploadMeta): Promise<UploadResult> {
      calls.push({ data, meta });
      return Promise.resolve({ url: `${publicBaseUrl}/${meta.filename}` });
    },
  };
}

// ---------------------------------------------------------------------------
// Happy path: POST /api/v1/images/upload with multipart/form-data
// ---------------------------------------------------------------------------

describe("POST /api/v1/images/upload — happy path via local adapter", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `wf-images-route-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns 200 with url and size fields when a valid JPEG is uploaded", async () => {
    const adapter = createLocalAdapter({
      baseDir: tmpDir,
      publicBaseUrl: "https://cdn.example.com/images",
    });
    const app = createImagesApp({ adapter });

    const jpegBytes = await makeMinimalJpeg();
    const formData = new FormData();
    formData.append("file", imageBlob(jpegBytes), "photo.jpg");

    const res = await app.request("/api/v1/images/upload", {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { url: string; size: number };
    expect(body.url.startsWith("https://cdn.example.com/images")).toBe(true);
    expect(typeof body.size).toBe("number");
    expect(body.size).toBeGreaterThan(0);
  });

  it("url in 200 response points to the uploaded resource (starts with publicBaseUrl)", async () => {
    const adapter = createLocalAdapter({
      baseDir: tmpDir,
      publicBaseUrl: "https://static.mysite.com",
    });
    const app = createImagesApp({ adapter });

    const jpegBytes = await makeMinimalJpeg();
    const formData = new FormData();
    formData.append("file", imageBlob(jpegBytes), "img.jpg");

    const res = await app.request("/api/v1/images/upload", {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { url: string };
    expect(body.url.startsWith("https://static.mysite.com")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-004: Credentials not consumed from request body
// ---------------------------------------------------------------------------

describe("AC-004: upload route ignores credential fields in multipart body", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `wf-cred-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("responds 200 even when accessKey field is present in multipart body (field is ignored)", async () => {
    const spy = makeSpyAdapter("https://cdn.test");
    const app = createImagesApp({ adapter: spy });

    const jpegBytes = await makeMinimalJpeg();
    const formData = new FormData();
    formData.append("file", imageBlob(jpegBytes), "photo.jpg");
    // Attacker-supplied credential fields — must be silently ignored
    formData.append("accessKey", "attacker-ak");
    formData.append("secretKey", "attacker-sk");

    const res = await app.request("/api/v1/images/upload", {
      method: "POST",
      body: formData,
    });

    // Route must succeed using injected adapter, not fail on unexpected fields
    expect(res.status).toBe(200);
  });

  it("the injected adapter is used (not a runtime-constructed adapter from body credentials)", async () => {
    const spy = makeSpyAdapter("https://spy-cdn.test");
    const app = createImagesApp({ adapter: spy });

    const jpegBytes = await makeMinimalJpeg();
    const formData = new FormData();
    formData.append("file", imageBlob(jpegBytes), "photo.jpg");
    formData.append("accessKey", "attacker-ak");

    const res = await app.request("/api/v1/images/upload", {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(200);
    // The spy adapter was called — body credentials did not route to a different adapter
    expect(spy.calls.length).toBe(1);
    const body = (await res.json()) as { url: string };
    // URL comes from spy adapter (spy-cdn.test), not from any attacker-provided credential
    expect(body.url.startsWith("https://spy-cdn.test")).toBe(true);
  });

  it("attacker-supplied accessKey field does not appear in the upload call's data bytes", async () => {
    const spy = makeSpyAdapter("https://cdn.test");
    const app = createImagesApp({ adapter: spy });

    const jpegBytes = await makeMinimalJpeg();
    const formData = new FormData();
    formData.append("file", imageBlob(jpegBytes), "photo.jpg");
    formData.append("accessKey", "attacker-ak");

    await app.request("/api/v1/images/upload", {
      method: "POST",
      body: formData,
    });

    // The uploaded data must be preprocessed image bytes, not a serialised form containing the key
    const uploadedData = spy.calls[0]?.data;
    if (uploadedData === undefined) {
      throw new Error("expected spy adapter to have received one upload call");
    }
    const uploadedString = Buffer.from(uploadedData).toString("utf8");
    expect(uploadedString).not.toContain("attacker-ak");
  });
});

// ---------------------------------------------------------------------------
// 413: file exceeds maxBytes
// ---------------------------------------------------------------------------

describe("POST /api/v1/images/upload — 413 when payload exceeds maxBytes", () => {
  it("returns 413 when the file body exceeds the configured maxBytes limit", async () => {
    const spy = makeSpyAdapter("https://cdn.test");
    // Set maxBytes to 10 bytes — any real image will exceed this
    const app = createImagesApp({ adapter: spy, maxBytes: 10 });

    const jpegBytes = await makeMinimalJpeg();
    const formData = new FormData();
    formData.append("file", imageBlob(jpegBytes), "big.jpg");

    const res = await app.request("/api/v1/images/upload", {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(413);
  });

  it("accepts upload when file is exactly at the maxBytes boundary", async () => {
    const spy = makeSpyAdapter("https://cdn.test");
    const tinyData = new Uint8Array([0x01, 0x02, 0x03]);
    // maxBytes = 3, data = 3 bytes — boundary should be accepted
    const app = createImagesApp({ adapter: spy, maxBytes: 3 });

    const formData = new FormData();
    formData.append("file", new Blob([tinyData], { type: "image/jpeg" }), "boundary.jpg");

    const res = await app.request("/api/v1/images/upload", {
      method: "POST",
      body: formData,
    });

    // Must NOT be 413 (boundary is allowed); may be 400 if not a valid image, but not 413
    expect(res.status).not.toBe(413);
  });
});

// ---------------------------------------------------------------------------
// 400: empty or missing file
// ---------------------------------------------------------------------------

describe("POST /api/v1/images/upload — 400 on missing or empty file field", () => {
  it("returns 400 when multipart body contains no 'file' field", async () => {
    const spy = makeSpyAdapter("https://cdn.test");
    const app = createImagesApp({ adapter: spy });

    const formData = new FormData();
    // Intentionally no 'file' field
    formData.append("other", "irrelevant");

    const res = await app.request("/api/v1/images/upload", {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when body is completely empty (no content-type)", async () => {
    const spy = makeSpyAdapter("https://cdn.test");
    const app = createImagesApp({ adapter: spy });

    const res = await app.request("/api/v1/images/upload", {
      method: "POST",
      headers: { "content-type": "application/octet-stream" },
      body: new Uint8Array(0),
    });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Wiring: createApp mounts the images route into the application tree
// ---------------------------------------------------------------------------

describe("createApp wires the images route into the application tree", () => {
  it("serves POST /api/v1/images/upload when an images adapter is provided", async () => {
    const spy = makeSpyAdapter("https://cdn.test");
    const app = createApp({ imagesAdapter: spy });

    const jpegBytes = await makeMinimalJpeg();
    const formData = new FormData();
    formData.append("file", imageBlob(jpegBytes), "photo.jpg");

    const res = await app.request("/api/v1/images/upload", { method: "POST", body: formData });

    expect(res.status).toBe(200);
    expect(spy.calls.length).toBe(1);
  });

  it("does not serve the upload route when no images adapter is configured", async () => {
    const app = createApp();

    const res = await app.request("/api/v1/images/upload", { method: "POST" });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// 502: adapter upload failure is mapped to a controlled response
// ---------------------------------------------------------------------------

describe("POST /api/v1/images/upload — 502 when adapter upload fails", () => {
  it("returns 502 when adapter.upload rejects", async () => {
    const failingAdapter: ImageHostAdapter = {
      name: "failing",
      upload() {
        return Promise.reject(new Error("backend down"));
      },
    };
    const app = createImagesApp({ adapter: failingAdapter });

    const jpegBytes = await makeMinimalJpeg();
    const formData = new FormData();
    formData.append("file", imageBlob(jpegBytes), "photo.jpg");

    const res = await app.request("/api/v1/images/upload", { method: "POST", body: formData });

    expect(res.status).toBe(502);
  });
});

// ---------------------------------------------------------------------------
// AC-003: Qiniu integration test — env-gated (CI skip when env absent)
// ---------------------------------------------------------------------------

const hasQiniuEnv =
  Boolean(process.env.QINIU_ACCESS_KEY) &&
  Boolean(process.env.QINIU_SECRET_KEY) &&
  Boolean(process.env.QINIU_BUCKET) &&
  Boolean(process.env.QINIU_DOMAIN);

describe.runIf(hasQiniuEnv)(
  "AC-003 [integration]: Qiniu adapter upload — URL is publicly reachable via HTTP GET",
  () => {
    it("uploaded URL returns HTTP 200 on GET", async () => {
      const { createQiniuAdapter } = await import("../../apps/relay/src/image-host/qiniu.ts");

      const adapter = createQiniuAdapter({
        accessKey: process.env.QINIU_ACCESS_KEY ?? "",
        secretKey: process.env.QINIU_SECRET_KEY ?? "",
        bucket: process.env.QINIU_BUCKET ?? "",
        domain: process.env.QINIU_DOMAIN ?? "",
      });

      const jpegBytes = await makeMinimalJpeg();
      const result = await adapter.upload(new Uint8Array(jpegBytes), {
        filename: `integration-test-${Date.now()}.jpg`,
        contentType: "image/jpeg",
      });

      expect(result.url.startsWith("http")).toBe(true);

      const getRes = await fetch(result.url, { method: "GET" });
      expect(getRes.status).toBe(200);
    });
  }
);
