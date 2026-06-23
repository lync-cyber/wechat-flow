import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadImageHostConfig } from "../../apps/relay/src/credentials/store.ts";
import { createAdapterFromConfig } from "../../apps/relay/src/image-host/factory.ts";
import { createLocalAdapter } from "../../apps/relay/src/image-host/local.ts";

// ---------------------------------------------------------------------------
// Local adapter — read / write round-trip
// ---------------------------------------------------------------------------

describe("local ImageHostAdapter: upload stores bytes and returns correct URL", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `wf-local-adapter-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("upload returns a URL that starts with publicBaseUrl", async () => {
    const adapter = createLocalAdapter({
      baseDir: tmpDir,
      publicBaseUrl: "https://cdn.example.com/images",
    });

    const data = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const result = await adapter.upload(data, { filename: "test.jpg", contentType: "image/jpeg" });

    expect(result.url.startsWith("https://cdn.example.com/images")).toBe(true);
  });

  it("uploaded bytes are persisted to disk and match the input data exactly", async () => {
    const adapter = createLocalAdapter({
      baseDir: tmpDir,
      publicBaseUrl: "https://cdn.example.com/images",
    });

    const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02]);
    const result = await adapter.upload(data, { filename: "test.png", contentType: "image/png" });

    // Derive file path from the returned URL
    const filename = result.url.replace("https://cdn.example.com/images/", "");
    const storedBytes = readFileSync(join(tmpDir, filename));

    expect(storedBytes.length).toBe(data.byteLength);
    expect(Array.from(storedBytes)).toEqual(Array.from(data));
  });

  it("adapter name is 'local'", () => {
    const adapter = createLocalAdapter({
      baseDir: tmpDir,
      publicBaseUrl: "https://cdn.example.com/images",
    });

    expect(adapter.name).toBe("local");
  });

  it("uploading two files produces two distinct URLs", async () => {
    const adapter = createLocalAdapter({
      baseDir: tmpDir,
      publicBaseUrl: "https://cdn.example.com/images",
    });

    const dataA = new Uint8Array([0x01, 0x02, 0x03]);
    const dataB = new Uint8Array([0x04, 0x05, 0x06]);

    const resultA = await adapter.upload(dataA, {
      filename: "a.jpg",
      contentType: "image/jpeg",
    });
    const resultB = await adapter.upload(dataB, {
      filename: "b.jpg",
      contentType: "image/jpeg",
    });

    expect(resultA.url).not.toBe(resultB.url);
  });
});

// ---------------------------------------------------------------------------
// loadImageHostConfig — credentials come from env only
// ---------------------------------------------------------------------------

describe("loadImageHostConfig: reads kind and credentials exclusively from env", () => {
  it("returns kind='local' when IMAGE_HOST env var is 'local'", () => {
    const config = loadImageHostConfig({
      IMAGE_HOST: "local",
      LOCAL_BASE_DIR: "/tmp/uploads",
      LOCAL_PUBLIC_BASE_URL: "https://cdn.example.com/images",
    });

    expect(config.kind).toBe("local");
  });

  it("local config carries baseDir and publicBaseUrl from env vars", () => {
    const config = loadImageHostConfig({
      IMAGE_HOST: "local",
      LOCAL_BASE_DIR: "/var/wf-uploads",
      LOCAL_PUBLIC_BASE_URL: "https://static.mysite.com",
    });

    expect(config.baseDir).toBe("/var/wf-uploads");
    expect(config.publicBaseUrl).toBe("https://static.mysite.com");
  });

  it("returns kind='qiniu' when IMAGE_HOST env var is 'qiniu'", () => {
    const config = loadImageHostConfig({
      IMAGE_HOST: "qiniu",
      QINIU_ACCESS_KEY: "fake-ak",
      QINIU_SECRET_KEY: "fake-sk",
      QINIU_BUCKET: "test-bucket",
      QINIU_DOMAIN: "https://cdn.example.com",
    });

    expect(config.kind).toBe("qiniu");
  });

  it("qiniu credentials object contains accessKey from QINIU_ACCESS_KEY env var", () => {
    const config = loadImageHostConfig({
      IMAGE_HOST: "qiniu",
      QINIU_ACCESS_KEY: "my-access-key-value",
      QINIU_SECRET_KEY: "my-secret-key-value",
      QINIU_BUCKET: "my-bucket",
      QINIU_DOMAIN: "https://cdn.mysite.com",
    });

    expect(config.credentials.accessKey).toBe("my-access-key-value");
  });

  it("qiniu credentials object contains secretKey from QINIU_SECRET_KEY env var", () => {
    const config = loadImageHostConfig({
      IMAGE_HOST: "qiniu",
      QINIU_ACCESS_KEY: "ak-123",
      QINIU_SECRET_KEY: "sk-abc",
      QINIU_BUCKET: "my-bucket",
      QINIU_DOMAIN: "https://cdn.mysite.com",
    });

    expect(config.credentials.secretKey).toBe("sk-abc");
  });

  it("throws (or returns error-state config) when IMAGE_HOST env var is missing", () => {
    // Credentials must not bleed in from some other source; missing config should error
    expect(() =>
      loadImageHostConfig({
        // no IMAGE_HOST
        QINIU_ACCESS_KEY: "ak",
      })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// createAdapterFromConfig — maps config kind to a concrete adapter
// ---------------------------------------------------------------------------

describe("createAdapterFromConfig: builds the adapter selected by config.kind", () => {
  it("returns a local adapter for kind='local'", () => {
    const adapter = createAdapterFromConfig({
      kind: "local",
      credentials: {},
      baseDir: "/tmp/wf-uploads",
      publicBaseUrl: "https://cdn.example.com",
    });

    expect(adapter.name).toBe("local");
  });

  it("returns a qiniu adapter for kind='qiniu'", () => {
    const adapter = createAdapterFromConfig({
      kind: "qiniu",
      credentials: { accessKey: "ak", secretKey: "sk", bucket: "b", domain: "https://d.test" },
    });

    expect(adapter.name).toBe("qiniu");
  });

  it("throws for an unsupported kind", () => {
    expect(() => createAdapterFromConfig({ kind: "oss", credentials: {} })).toThrow();
  });
});
