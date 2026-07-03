import sharp from "sharp";
import { describe, expect, it } from "vitest";
import type {
  ImageHostAdapter,
  UploadMeta,
  UploadResult,
} from "../../apps/relay/src/image-host/types.ts";
import {
  UploadJobError,
  createUploadProcessor,
} from "../../apps/relay/src/job/upload-processor.ts";

async function makeMinimalJpegBase64(): Promise<string> {
  const buf = await sharp({
    create: { width: 1, height: 1, channels: 3, background: { r: 128, g: 128, b: 128 } },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
  return buf.toString("base64");
}

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

function collectProgress() {
  const calls: number[] = [];
  const updateProgress = async (p: number) => {
    calls.push(p);
  };
  return { calls, updateProgress };
}

describe("createUploadProcessor: progress stages", () => {
  it("reports progress 0.1 -> 0.5 -> 0.9 over the upload lifecycle", async () => {
    const adapter = makeSpyAdapter();
    const processor = createUploadProcessor(adapter);
    const { calls, updateProgress } = collectProgress();

    const data = await makeMinimalJpegBase64();
    await processor({ data, filename: "photo.jpg" }, updateProgress);

    expect(calls).toEqual([0.1, 0.5, 0.9]);
  });
});

describe("createUploadProcessor: success result", () => {
  it("returns { url, size } from the adapter's upload result", async () => {
    const adapter = makeSpyAdapter("https://cdn.example.com");
    const processor = createUploadProcessor(adapter);
    const { updateProgress } = collectProgress();

    const data = await makeMinimalJpegBase64();
    const result = await processor({ data, filename: "photo.jpg" }, updateProgress);

    expect(result.url).toBe("https://cdn.example.com/photo.jpg");
    expect(typeof result.size).toBe("number");
    expect(result.size).toBeGreaterThan(0);
  });

  it("defaults filename to 'upload' when not provided", async () => {
    const adapter = makeSpyAdapter("https://cdn.example.com");
    const processor = createUploadProcessor(adapter);
    const { updateProgress } = collectProgress();

    const data = await makeMinimalJpegBase64();
    await processor({ data }, updateProgress);

    expect(adapter.calls[0]?.meta.filename).toBe("upload");
  });

  it("passes contentType derived from the preprocessed image format", async () => {
    const adapter = makeSpyAdapter();
    const processor = createUploadProcessor(adapter);
    const { updateProgress } = collectProgress();

    const data = await makeMinimalJpegBase64();
    await processor({ data, filename: "photo.jpg" }, updateProgress);

    expect(adapter.calls[0]?.meta.contentType).toBe("image/jpeg");
  });
});

describe("createUploadProcessor: E_INVALID_IMAGE", () => {
  it("throws UploadJobError with code E_INVALID_IMAGE when bytes are not a decodable image", async () => {
    const adapter = makeSpyAdapter();
    const processor = createUploadProcessor(adapter);
    const { updateProgress } = collectProgress();

    const garbage = Buffer.from("not an image").toString("base64");

    await expect(processor({ data: garbage }, updateProgress)).rejects.toMatchObject({
      code: "E_INVALID_IMAGE",
    });
    await expect(processor({ data: garbage }, updateProgress)).rejects.toBeInstanceOf(
      UploadJobError
    );
  });

  it("does not call adapter.upload when preprocessing fails", async () => {
    const adapter = makeSpyAdapter();
    const processor = createUploadProcessor(adapter);
    const { updateProgress } = collectProgress();

    const garbage = Buffer.from("not an image").toString("base64");
    await expect(processor({ data: garbage }, updateProgress)).rejects.toThrow();

    expect(adapter.calls.length).toBe(0);
  });
});

describe("createUploadProcessor: E_UPLOAD_FAILED", () => {
  it("throws UploadJobError with code E_UPLOAD_FAILED when adapter.upload rejects", async () => {
    const failingAdapter: ImageHostAdapter = {
      name: "failing",
      upload() {
        return Promise.reject(new Error("backend down"));
      },
    };
    const processor = createUploadProcessor(failingAdapter);
    const { updateProgress } = collectProgress();

    const data = await makeMinimalJpegBase64();

    await expect(processor({ data, filename: "photo.jpg" }, updateProgress)).rejects.toMatchObject({
      code: "E_UPLOAD_FAILED",
    });
    await expect(processor({ data, filename: "photo.jpg" }, updateProgress)).rejects.toBeInstanceOf(
      UploadJobError
    );
  });
});
