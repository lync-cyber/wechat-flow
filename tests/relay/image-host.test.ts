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

  it("oss credentials read accessKeyId/secret/bucket/region from env", () => {
    const config = loadImageHostConfig({
      IMAGE_HOST: "oss",
      OSS_ACCESS_KEY_ID: "oss-id",
      OSS_ACCESS_KEY_SECRET: "oss-sec",
      OSS_BUCKET: "oss-bucket",
      OSS_REGION: "oss-cn-hangzhou",
    });

    expect(config.kind).toBe("oss");
    expect(config.credentials.accessKeyId).toBe("oss-id");
    expect(config.credentials.accessKeySecret).toBe("oss-sec");
    expect(config.credentials.region).toBe("oss-cn-hangzhou");
  });

  it("cos credentials read secretId/secretKey/bucket/region from env", () => {
    const config = loadImageHostConfig({
      IMAGE_HOST: "cos",
      COS_SECRET_ID: "cos-sid",
      COS_SECRET_KEY: "cos-sk",
      COS_BUCKET: "cos-b-1250000000",
      COS_REGION: "ap-guangzhou",
    });

    expect(config.kind).toBe("cos");
    expect(config.credentials.secretId).toBe("cos-sid");
    expect(config.credentials.region).toBe("ap-guangzhou");
  });

  it("smms credentials read token from env", () => {
    const config = loadImageHostConfig({ IMAGE_HOST: "smms", SMMS_TOKEN: "smms-tok" });

    expect(config.kind).toBe("smms");
    expect(config.credentials.token).toBe("smms-tok");
  });

  it("custom credentials read endpoint/token from env", () => {
    const config = loadImageHostConfig({
      IMAGE_HOST: "custom",
      CUSTOM_UPLOAD_ENDPOINT: "https://upload.example.com",
      CUSTOM_UPLOAD_TOKEN: "custom-tok",
    });

    expect(config.kind).toBe("custom");
    expect(config.credentials.endpoint).toBe("https://upload.example.com");
    expect(config.credentials.token).toBe("custom-tok");
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

  it("returns an oss adapter for kind='oss'", () => {
    const adapter = createAdapterFromConfig({
      kind: "oss",
      credentials: {
        accessKeyId: "ak",
        accessKeySecret: "sk",
        bucket: "b",
        region: "oss-cn-hangzhou",
      },
    });
    expect(adapter.name).toBe("oss");
  });

  it("returns a cos adapter for kind='cos'", () => {
    const adapter = createAdapterFromConfig({
      kind: "cos",
      credentials: {
        secretId: "sid",
        secretKey: "sk",
        bucket: "b-1250000000",
        region: "ap-guangzhou",
      },
    });
    expect(adapter.name).toBe("cos");
  });

  it("returns a smms adapter for kind='smms'", () => {
    const adapter = createAdapterFromConfig({
      kind: "smms",
      credentials: { token: "tok" },
    });
    expect(adapter.name).toBe("smms");
  });

  it("returns a custom adapter for kind='custom'", () => {
    const adapter = createAdapterFromConfig({
      kind: "custom",
      credentials: { endpoint: "https://upload.example.com" },
    });
    expect(adapter.name).toBe("custom");
  });

  it("oss adapter with domain set produces a non-empty name via createAdapterFromConfig", () => {
    const adapter = createAdapterFromConfig({
      kind: "oss",
      credentials: {
        accessKeyId: "ak",
        accessKeySecret: "sk",
        bucket: "b",
        region: "oss-cn-hangzhou",
        domain: "https://cdn.mysite.com",
      },
    });
    expect(adapter.name).toBe("oss");
  });

  it("cos adapter with domain set produces a non-empty name via createAdapterFromConfig", () => {
    const adapter = createAdapterFromConfig({
      kind: "cos",
      credentials: {
        secretId: "sid",
        secretKey: "sk",
        bucket: "b-1250000000",
        region: "ap-guangzhou",
        domain: "https://cdn.mysite.com",
      },
    });
    expect(adapter.name).toBe("cos");
  });

  it("custom adapter with token set produces name='custom'", () => {
    const adapter = createAdapterFromConfig({
      kind: "custom",
      credentials: { endpoint: "https://upload.example.com", token: "tok-123" },
    });
    expect(adapter.name).toBe("custom");
  });

  it("throws for an unknown kind", () => {
    expect(() =>
      createAdapterFromConfig({
        kind: "unknown" as "local",
        credentials: {},
      })
    ).toThrow();
  });

  it("local adapter without baseDir/publicBaseUrl falls back to empty strings (name is 'local')", () => {
    const adapter = createAdapterFromConfig({
      kind: "local",
      credentials: {},
    });
    expect(adapter.name).toBe("local");
  });

  it("qiniu adapter without credential fields throws (fail-fast on missing credentials)", () => {
    expect(() => createAdapterFromConfig({ kind: "qiniu", credentials: {} })).toThrow(
      /missing required credentials/
    );
  });

  it("oss adapter without credential fields throws (fail-fast on missing credentials)", () => {
    expect(() => createAdapterFromConfig({ kind: "oss", credentials: {} })).toThrow(
      /missing required credentials/
    );
  });

  it("cos adapter without credential fields throws (fail-fast on missing credentials)", () => {
    expect(() => createAdapterFromConfig({ kind: "cos", credentials: {} })).toThrow(
      /missing required credentials/
    );
  });

  it("smms adapter without token field throws (fail-fast on missing credentials)", () => {
    expect(() => createAdapterFromConfig({ kind: "smms", credentials: {} })).toThrow(
      /missing required credentials/
    );
  });

  it("custom adapter without endpoint field throws (fail-fast on missing credentials)", () => {
    expect(() => createAdapterFromConfig({ kind: "custom", credentials: {} })).toThrow(
      /missing required credentials/
    );
  });

  it("error message names the specific missing credential field", () => {
    expect(() =>
      createAdapterFromConfig({ kind: "qiniu", credentials: { accessKey: "ak" } })
    ).toThrow(/secretKey/);
  });

  it("treats an empty-string credential as missing (fail-fast)", () => {
    expect(() =>
      createAdapterFromConfig({
        kind: "qiniu",
        credentials: { accessKey: "", secretKey: "sk", bucket: "b", domain: "https://d.test" },
      })
    ).toThrow(/missing required credentials/);
  });
});

// ---------------------------------------------------------------------------
// loadImageHostConfig: branch coverage — custom without optional fields, domain absence, unknown kind
// ---------------------------------------------------------------------------

describe("loadImageHostConfig: branch coverage", () => {
  it("custom without token/responseUrlField — credentials has only endpoint", () => {
    const config = loadImageHostConfig({
      IMAGE_HOST: "custom",
      CUSTOM_UPLOAD_ENDPOINT: "https://upload.example.com",
    });

    expect(config.kind).toBe("custom");
    expect(config.credentials.endpoint).toBe("https://upload.example.com");
    expect(config.credentials.token).toBeUndefined();
    expect(config.credentials.responseUrlField).toBeUndefined();
  });

  it("oss without OSS_DOMAIN — credentials has no domain key", () => {
    const config = loadImageHostConfig({
      IMAGE_HOST: "oss",
      OSS_ACCESS_KEY_ID: "ak",
      OSS_ACCESS_KEY_SECRET: "sk",
      OSS_BUCKET: "b",
      OSS_REGION: "oss-cn-hangzhou",
    });

    expect(config.credentials.domain).toBeUndefined();
  });

  it("cos without COS_DOMAIN — credentials has no domain key", () => {
    const config = loadImageHostConfig({
      IMAGE_HOST: "cos",
      COS_SECRET_ID: "sid",
      COS_SECRET_KEY: "sk",
      COS_BUCKET: "b-1250000000",
      COS_REGION: "ap-guangzhou",
    });

    expect(config.credentials.domain).toBeUndefined();
  });

  it("throws for an unknown IMAGE_HOST kind", () => {
    expect(() => loadImageHostConfig({ IMAGE_HOST: "unknown" })).toThrow();
  });

  it("qiniu with no credential env vars falls back to empty strings", () => {
    const config = loadImageHostConfig({ IMAGE_HOST: "qiniu" });
    expect(config.kind).toBe("qiniu");
    expect(config.credentials.accessKey).toBe("");
    expect(config.credentials.secretKey).toBe("");
    expect(config.credentials.bucket).toBe("");
    expect(config.credentials.domain).toBe("");
  });

  it("oss with no credential env vars falls back to empty strings", () => {
    const config = loadImageHostConfig({ IMAGE_HOST: "oss" });
    expect(config.kind).toBe("oss");
    expect(config.credentials.accessKeyId).toBe("");
    expect(config.credentials.region).toBe("");
  });

  it("cos with no credential env vars falls back to empty strings", () => {
    const config = loadImageHostConfig({ IMAGE_HOST: "cos" });
    expect(config.kind).toBe("cos");
    expect(config.credentials.secretId).toBe("");
    expect(config.credentials.region).toBe("");
  });

  it("smms with no credential env vars falls back to empty string token", () => {
    const config = loadImageHostConfig({ IMAGE_HOST: "smms" });
    expect(config.kind).toBe("smms");
    expect(config.credentials.token).toBe("");
  });

  it("custom with no credential env vars falls back to empty string endpoint", () => {
    const config = loadImageHostConfig({ IMAGE_HOST: "custom" });
    expect(config.kind).toBe("custom");
    expect(config.credentials.endpoint).toBe("");
  });

  it("oss with OSS_DOMAIN set includes domain in credentials", () => {
    const config = loadImageHostConfig({
      IMAGE_HOST: "oss",
      OSS_DOMAIN: "https://cdn.mysite.com",
    });
    expect(config.credentials.domain).toBe("https://cdn.mysite.com");
  });

  it("cos with COS_DOMAIN set includes domain in credentials", () => {
    const config = loadImageHostConfig({
      IMAGE_HOST: "cos",
      COS_DOMAIN: "https://cdn.mysite.com",
    });
    expect(config.credentials.domain).toBe("https://cdn.mysite.com");
  });

  it("custom with token and responseUrlField set includes both in credentials", () => {
    const config = loadImageHostConfig({
      IMAGE_HOST: "custom",
      CUSTOM_UPLOAD_ENDPOINT: "https://upload.example.com",
      CUSTOM_UPLOAD_TOKEN: "tok",
      CUSTOM_RESPONSE_URL_FIELD: "url",
    });
    expect(config.credentials.token).toBe("tok");
    expect(config.credentials.responseUrlField).toBe("url");
  });
});

// ---------------------------------------------------------------------------
// local adapter: branch coverage — contentType not in MIME map, filename ext handling
// ---------------------------------------------------------------------------

describe("createLocalAdapter: branch coverage — extension derivation", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `wf-local-ext-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("unknown contentType but filename has allowed ext (.png) — result filename ends with .png", async () => {
    const adapter = createLocalAdapter({
      baseDir: tmpDir,
      publicBaseUrl: "https://cdn.example.com/images",
    });

    const data = new Uint8Array([0x01, 0x02]);
    const result = await adapter.upload(data, {
      filename: "photo.png",
      contentType: "application/octet-stream",
    });

    expect(result.url).toMatch(/\.png$/);
  });

  it("unknown contentType and filename ext not in allowlist (.exe) — result filename ends with .bin", async () => {
    const adapter = createLocalAdapter({
      baseDir: tmpDir,
      publicBaseUrl: "https://cdn.example.com/images",
    });

    const data = new Uint8Array([0x01, 0x02]);
    const result = await adapter.upload(data, {
      filename: "malware.exe",
      contentType: "application/octet-stream",
    });

    expect(result.url).toMatch(/\.bin$/);
  });
});
