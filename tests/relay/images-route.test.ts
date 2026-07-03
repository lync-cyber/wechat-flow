import { EventEmitter } from "node:events";
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
import type { JobRecord, JobStore } from "../../apps/relay/src/job/types.ts";
import { createUploadProcessor } from "../../apps/relay/src/job/upload-processor.ts";
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

function makeMemoryJobStore(): JobStore & { records: Map<string, JobRecord> } {
  const records = new Map<string, JobRecord>();
  return {
    records,
    async get(jobId) {
      return records.get(jobId) ?? null;
    },
    async upsert(record) {
      records.set(record.jobId, { ...record });
    },
    async findByIdempotency() {
      return null;
    },
  };
}

/** Waits for the job to reach a terminal state (succeeded/failed) via a bounded polling loop. */
async function waitForTerminal(
  store: JobStore,
  jobId: string,
  maxWaitMs = 10_000
): Promise<JobRecord> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const record = await store.get(jobId);
    if (record && (record.state === "succeeded" || record.state === "failed")) {
      return record;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`job ${jobId} did not reach a terminal state in time`);
}

/** Waits until the given event name has fired at least `count` times, collecting payloads. */
function collectEvents(emitter: EventEmitter, event: string): { payloads: unknown[] } {
  const payloads: unknown[] = [];
  emitter.on(event, (payload: unknown) => {
    payloads.push(payload);
  });
  return { payloads };
}

function waitUntil(check: () => boolean, maxWaitMs = 10_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + maxWaitMs;
    const tick = () => {
      if (check()) return resolve();
      if (Date.now() >= deadline)
        return reject(new Error("waitUntil: condition never became true"));
      setTimeout(tick, 10);
    };
    tick();
  });
}

// ---------------------------------------------------------------------------
// Happy path: POST /api/v1/images/upload with multipart/form-data
// ---------------------------------------------------------------------------

describe("POST /api/v1/images/upload — 202 + async job via local adapter", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `wf-images-route-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns 202 with a jobId when a valid JPEG is uploaded", async () => {
    const adapter = createLocalAdapter({
      baseDir: tmpDir,
      publicBaseUrl: "https://cdn.example.com/images",
    });
    const store = makeMemoryJobStore();
    const sseEmitter = new EventEmitter();
    const app = createImagesApp({
      store,
      sseEmitter,
      processUpload: createUploadProcessor(adapter),
    });

    const jpegBytes = await makeMinimalJpeg();
    const formData = new FormData();
    formData.append("file", imageBlob(jpegBytes), "photo.jpg");

    const res = await app.request("/api/v1/images/upload", {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(202);
    const body = (await res.json()) as { jobId: string };
    expect(typeof body.jobId).toBe("string");
    expect(body.jobId.length).toBeGreaterThan(0);
  });

  it("job transitions pending -> running -> succeeded, with progress 0.1 -> 0.5 -> 0.9 -> 1", async () => {
    const spy = makeSpyAdapter("https://cdn.test");
    const store = makeMemoryJobStore();
    const sseEmitter = new EventEmitter();
    const progressEvents = collectEvents(sseEmitter, "progress");
    const app = createImagesApp({
      store,
      sseEmitter,
      processUpload: createUploadProcessor(spy),
    });

    const jpegBytes = await makeMinimalJpeg();
    const formData = new FormData();
    formData.append("file", imageBlob(jpegBytes), "photo.jpg");

    const res = await app.request("/api/v1/images/upload", { method: "POST", body: formData });
    const { jobId } = (await res.json()) as { jobId: string };

    const initial = await store.get(jobId);
    expect(initial?.state).toBe("pending");
    expect(initial?.progress).toBe(0);

    const finalRecord = await waitForTerminal(store, jobId);
    expect(finalRecord.state).toBe("succeeded");
    expect(finalRecord.progress).toBe(1);
    expect((finalRecord.result as { url: string }).url).toBe("https://cdn.test/photo.jpg");

    expect(progressEvents.payloads.map((p) => (p as { data: number }).data)).toEqual([
      0.1, 0.5, 0.9,
    ]);
  });

  it("emits active -> progress -> completed SSE events in order", async () => {
    const spy = makeSpyAdapter("https://cdn.test");
    const store = makeMemoryJobStore();
    const sseEmitter = new EventEmitter();
    const eventOrder: string[] = [];
    sseEmitter.on("active", () => eventOrder.push("active"));
    sseEmitter.on("progress", () => eventOrder.push("progress"));
    sseEmitter.on("completed", () => eventOrder.push("completed"));
    const app = createImagesApp({
      store,
      sseEmitter,
      processUpload: createUploadProcessor(spy),
    });

    const jpegBytes = await makeMinimalJpeg();
    const formData = new FormData();
    formData.append("file", imageBlob(jpegBytes), "photo.jpg");

    const res = await app.request("/api/v1/images/upload", { method: "POST", body: formData });
    const { jobId } = (await res.json()) as { jobId: string };

    await waitForTerminal(store, jobId);

    expect(eventOrder[0]).toBe("active");
    expect(eventOrder[eventOrder.length - 1]).toBe("completed");
    expect(eventOrder.filter((e) => e === "progress").length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// AC-004: Credentials not consumed from request body
// ---------------------------------------------------------------------------

describe("AC-004: upload route ignores credential fields in multipart body", () => {
  it("responds 202 even when accessKey field is present in multipart body (field is ignored)", async () => {
    const spy = makeSpyAdapter("https://cdn.test");
    const store = makeMemoryJobStore();
    const sseEmitter = new EventEmitter();
    const app = createImagesApp({ store, sseEmitter, processUpload: createUploadProcessor(spy) });

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
    expect(res.status).toBe(202);
  });

  it("the injected adapter is used (not a runtime-constructed adapter from body credentials)", async () => {
    const spy = makeSpyAdapter("https://spy-cdn.test");
    const store = makeMemoryJobStore();
    const sseEmitter = new EventEmitter();
    const app = createImagesApp({ store, sseEmitter, processUpload: createUploadProcessor(spy) });

    const jpegBytes = await makeMinimalJpeg();
    const formData = new FormData();
    formData.append("file", imageBlob(jpegBytes), "photo.jpg");
    formData.append("accessKey", "attacker-ak");

    const res = await app.request("/api/v1/images/upload", {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(202);
    const { jobId } = (await res.json()) as { jobId: string };
    const finalRecord = await waitForTerminal(store, jobId);

    // The spy adapter was called — body credentials did not route to a different adapter
    expect(spy.calls.length).toBe(1);
    // URL comes from spy adapter (spy-cdn.test), not from any attacker-provided credential
    expect((finalRecord.result as { url: string }).url.startsWith("https://spy-cdn.test")).toBe(
      true
    );
  });

  it("attacker-supplied accessKey field does not appear in the upload call's data bytes", async () => {
    const spy = makeSpyAdapter("https://cdn.test");
    const store = makeMemoryJobStore();
    const sseEmitter = new EventEmitter();
    const app = createImagesApp({ store, sseEmitter, processUpload: createUploadProcessor(spy) });

    const jpegBytes = await makeMinimalJpeg();
    const formData = new FormData();
    formData.append("file", imageBlob(jpegBytes), "photo.jpg");
    formData.append("accessKey", "attacker-ak");

    const res = await app.request("/api/v1/images/upload", {
      method: "POST",
      body: formData,
    });
    const { jobId } = (await res.json()) as { jobId: string };
    await waitForTerminal(store, jobId);

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
    const store = makeMemoryJobStore();
    const sseEmitter = new EventEmitter();
    // Set maxBytes to 10 bytes — any real image will exceed this
    const app = createImagesApp({
      store,
      sseEmitter,
      processUpload: createUploadProcessor(spy),
      maxBytes: 10,
    });

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
    const store = makeMemoryJobStore();
    const sseEmitter = new EventEmitter();
    const tinyData = new Uint8Array([0x01, 0x02, 0x03]);
    // maxBytes = 3, data = 3 bytes — boundary should be accepted
    const app = createImagesApp({
      store,
      sseEmitter,
      processUpload: createUploadProcessor(spy),
      maxBytes: 3,
    });

    const formData = new FormData();
    formData.append("file", new Blob([tinyData], { type: "image/jpeg" }), "boundary.jpg");

    const res = await app.request("/api/v1/images/upload", {
      method: "POST",
      body: formData,
    });

    // Must NOT be 413 (boundary is allowed) — a 202 is issued and the job later fails decoding.
    expect(res.status).not.toBe(413);
    expect(res.status).toBe(202);
  });
});

// ---------------------------------------------------------------------------
// 400: empty or missing file
// ---------------------------------------------------------------------------

describe("POST /api/v1/images/upload — 400 on missing or empty file field", () => {
  it("returns 400 when multipart body contains no 'file' field", async () => {
    const spy = makeSpyAdapter("https://cdn.test");
    const store = makeMemoryJobStore();
    const sseEmitter = new EventEmitter();
    const app = createImagesApp({ store, sseEmitter, processUpload: createUploadProcessor(spy) });

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
    const store = makeMemoryJobStore();
    const sseEmitter = new EventEmitter();
    const app = createImagesApp({ store, sseEmitter, processUpload: createUploadProcessor(spy) });

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
  it("serves POST /api/v1/images/upload when an images adapter + jobsDeps are provided", async () => {
    const spy = makeSpyAdapter("https://cdn.test");
    const store = makeMemoryJobStore();
    const sseEmitter = new EventEmitter();
    const app = createApp({
      imagesAdapter: spy,
      jobsDeps: { store, enqueue: async () => "unused", sseEmitter },
    });

    const jpegBytes = await makeMinimalJpeg();
    const formData = new FormData();
    formData.append("file", imageBlob(jpegBytes), "photo.jpg");

    const res = await app.request("/api/v1/images/upload", { method: "POST", body: formData });

    expect(res.status).toBe(202);
    const { jobId } = (await res.json()) as { jobId: string };
    await waitForTerminal(store, jobId);
    expect(spy.calls.length).toBe(1);
  });

  it("does not serve the upload route when no images adapter is configured", async () => {
    const app = createApp();

    const res = await app.request("/api/v1/images/upload", { method: "POST" });

    expect(res.status).toBe(404);
  });

  it("does not serve the upload route when jobsDeps.sseEmitter is missing", async () => {
    const spy = makeSpyAdapter("https://cdn.test");
    const store = makeMemoryJobStore();
    const app = createApp({
      imagesAdapter: spy,
      jobsDeps: { store, enqueue: async () => "unused" },
    });

    const res = await app.request("/api/v1/images/upload", { method: "POST" });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Failure: adapter upload failure surfaces as a failed job (not an HTTP error)
// ---------------------------------------------------------------------------

describe("POST /api/v1/images/upload — adapter failure surfaces as a failed job", () => {
  it("job ends in state=failed with error.code=E_UPLOAD_FAILED when adapter.upload rejects", async () => {
    const failingAdapter: ImageHostAdapter = {
      name: "failing",
      upload() {
        return Promise.reject(new Error("backend down"));
      },
    };
    const store = makeMemoryJobStore();
    const sseEmitter = new EventEmitter();
    const failedEvents = collectEvents(sseEmitter, "failed");
    const app = createImagesApp({
      store,
      sseEmitter,
      processUpload: createUploadProcessor(failingAdapter),
    });

    const jpegBytes = await makeMinimalJpeg();
    const formData = new FormData();
    formData.append("file", imageBlob(jpegBytes), "photo.jpg");

    const res = await app.request("/api/v1/images/upload", { method: "POST", body: formData });
    expect(res.status).toBe(202);
    const { jobId } = (await res.json()) as { jobId: string };

    const finalRecord = await waitForTerminal(store, jobId);
    expect(finalRecord.state).toBe("failed");
    expect(finalRecord.error?.code).toBe("E_UPLOAD_FAILED");

    await waitUntil(() => failedEvents.payloads.length > 0);
    expect((failedEvents.payloads[0] as { error: { code: string } }).error.code).toBe(
      "E_UPLOAD_FAILED"
    );
  });

  it("job ends in state=failed with error.code=E_INVALID_IMAGE for undecodable bytes", async () => {
    const spy = makeSpyAdapter("https://cdn.test");
    const store = makeMemoryJobStore();
    const sseEmitter = new EventEmitter();
    const app = createImagesApp({ store, sseEmitter, processUpload: createUploadProcessor(spy) });

    const garbage = new Uint8Array([
      0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
    ]);
    const formData = new FormData();
    formData.append("file", new Blob([garbage], { type: "image/jpeg" }), "bad.jpg");

    const res = await app.request("/api/v1/images/upload", { method: "POST", body: formData });
    expect(res.status).toBe(202);
    const { jobId } = (await res.json()) as { jobId: string };

    const finalRecord = await waitForTerminal(store, jobId);
    expect(finalRecord.state).toBe("failed");
    expect(finalRecord.error?.code).toBe("E_INVALID_IMAGE");
    expect(spy.calls.length).toBe(0);
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
