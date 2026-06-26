import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ValidationError,
  composeUploadWechatAsset,
  subscribeJob,
} from "../../packages/core/src/composers/upload-wechat-asset.ts";
import type { WechatAssetRelayClient } from "../../packages/core/src/composers/upload-wechat-asset.ts";

// --- AC-001: composeUploadWechatAsset calls POST /api/v1/wechat-assets/upload and returns JobHandle ---

describe("AC-001: composeUploadWechatAsset returns JobHandle from relay", () => {
  let client: WechatAssetRelayClient;

  beforeEach(() => {
    client = {
      uploadWechatAsset: vi.fn().mockResolvedValue({ jobId: "job-abc-123" }),
    };
  });

  it("calls uploadWechatAsset with imageUrl and type", async () => {
    await composeUploadWechatAsset(
      { imageUrl: "https://example.com/img.jpg", type: "image" },
      client
    );

    expect(client.uploadWechatAsset).toHaveBeenCalledOnce();
    expect(client.uploadWechatAsset).toHaveBeenCalledWith({
      imageUrl: "https://example.com/img.jpg",
      type: "image",
    });
  });

  it("returns JobHandle { jobId } from relay response", async () => {
    const handle = await composeUploadWechatAsset(
      { imageUrl: "https://example.com/img.jpg", type: "image" },
      client
    );

    expect(handle.jobId).toBe("job-abc-123");
  });

  it("works with type=voice", async () => {
    vi.mocked(client.uploadWechatAsset).mockResolvedValue({ jobId: "job-voice-456" });
    const handle = await composeUploadWechatAsset(
      { imageUrl: "https://example.com/audio.mp3", type: "voice" },
      client
    );
    expect(handle.jobId).toBe("job-voice-456");
    expect(client.uploadWechatAsset).toHaveBeenCalledWith({
      imageUrl: "https://example.com/audio.mp3",
      type: "voice",
    });
  });

  it("works with type=video", async () => {
    vi.mocked(client.uploadWechatAsset).mockResolvedValue({ jobId: "job-video-789" });
    const handle = await composeUploadWechatAsset(
      { imageUrl: "https://example.com/video.mp4", type: "video" },
      client
    );
    expect(handle.jobId).toBe("job-video-789");
  });

  it("works with type=thumb", async () => {
    vi.mocked(client.uploadWechatAsset).mockResolvedValue({ jobId: "job-thumb-000" });
    const handle = await composeUploadWechatAsset(
      { imageUrl: "https://example.com/thumb.jpg", type: "thumb" },
      client
    );
    expect(handle.jobId).toBe("job-thumb-000");
  });
});

// --- AC-002: validation — https URL and type enum ---

describe("AC-002: input validation throws ValidationError", () => {
  let client: WechatAssetRelayClient;

  beforeEach(() => {
    client = {
      uploadWechatAsset: vi.fn().mockResolvedValue({ jobId: "job-xyz" }),
    };
  });

  it("throws ValidationError when imageUrl is not https", async () => {
    await expect(
      composeUploadWechatAsset({ imageUrl: "http://example.com/img.jpg", type: "image" }, client)
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws ValidationError when imageUrl is empty string", async () => {
    await expect(
      composeUploadWechatAsset({ imageUrl: "", type: "image" }, client)
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws ValidationError when imageUrl has no scheme", async () => {
    await expect(
      composeUploadWechatAsset({ imageUrl: "example.com/img.jpg", type: "image" }, client)
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws ValidationError when type is not in the allowed enum", async () => {
    await expect(
      // @ts-expect-error intentional invalid type for test
      composeUploadWechatAsset({ imageUrl: "https://example.com/img.jpg", type: "gif" }, client)
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws ValidationError when type is undefined", async () => {
    await expect(
      // @ts-expect-error intentional invalid type for test
      composeUploadWechatAsset({ imageUrl: "https://example.com/img.jpg", type: undefined }, client)
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("ValidationError message mentions the invalid field for bad URL", async () => {
    let caughtError: ValidationError | undefined;
    try {
      await composeUploadWechatAsset(
        { imageUrl: "ftp://example.com/img.jpg", type: "image" },
        client
      );
    } catch (e) {
      if (e instanceof ValidationError) caughtError = e;
    }
    expect(caughtError).toBeDefined();
    expect(caughtError?.message).toMatch(/imageUrl/);
  });

  it("ValidationError message mentions the invalid field for bad type", async () => {
    let caughtError: ValidationError | undefined;
    try {
      await composeUploadWechatAsset(
        { imageUrl: "https://example.com/img.jpg", type: "pdf" as never },
        client
      );
    } catch (e) {
      if (e instanceof ValidationError) caughtError = e;
    }
    expect(caughtError).toBeDefined();
    expect(caughtError?.message).toMatch(/type/);
  });

  it("does not call relay client when validation fails", async () => {
    try {
      await composeUploadWechatAsset(
        { imageUrl: "http://not-https.com/img.jpg", type: "image" },
        client
      );
    } catch {
      // expected
    }
    expect(client.uploadWechatAsset).not.toHaveBeenCalled();
  });
});

// --- AC-003: subscribeJob SSE helper ---

describe("AC-003: subscribeJob wires EventSource to callbacks", () => {
  type EventHandler = (e: { data: string }) => void;

  class MockEventSource {
    url: string;
    listeners: Record<string, EventHandler[]> = {};
    closeCalled = false;

    constructor(url: string) {
      this.url = url;
    }

    addEventListener(event: string, handler: EventHandler) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(handler);
    }

    emit(event: string, data: unknown) {
      for (const handler of this.listeners[event] ?? []) {
        handler({ data: JSON.stringify(data) });
      }
    }

    close() {
      this.closeCalled = true;
    }
  }

  let mockEs: MockEventSource;
  const factory = (url: string) => {
    mockEs = new MockEventSource(url);
    return mockEs as unknown as EventSource;
  };

  it("opens EventSource on the correct jobs SSE URL", () => {
    subscribeJob("job-abc", vi.fn(), vi.fn(), vi.fn(), factory);
    expect(mockEs.url).toBe("/api/v1/jobs/job-abc/events");
  });

  it("calls onProgress with percent when progress event fires", () => {
    const onProgress = vi.fn();
    subscribeJob("job-abc", onProgress, vi.fn(), vi.fn(), factory);

    mockEs.emit("progress", { progress: 42 });

    expect(onProgress).toHaveBeenCalledOnce();
    expect(onProgress).toHaveBeenCalledWith(42);
  });

  it("calls onComplete with result when succeeded event fires", () => {
    const onComplete = vi.fn();
    subscribeJob("job-abc", vi.fn(), onComplete, vi.fn(), factory);

    mockEs.emit("succeeded", { result: { url: "https://res.example.com/upload.jpg" } });

    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith({ url: "https://res.example.com/upload.jpg" });
  });

  it("calls onError with error object when failed event fires", () => {
    const onError = vi.fn();
    subscribeJob("job-abc", vi.fn(), vi.fn(), onError, factory);

    mockEs.emit("failed", { error: { code: "E_UPLOAD_FAILED", message: "upload failed" } });

    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith({ code: "E_UPLOAD_FAILED", message: "upload failed" });
  });

  it("closes EventSource after succeeded event", () => {
    subscribeJob("job-abc", vi.fn(), vi.fn(), vi.fn(), factory);

    mockEs.emit("succeeded", { result: {} });

    expect(mockEs.closeCalled).toBe(true);
  });

  it("closes EventSource after failed event", () => {
    subscribeJob("job-abc", vi.fn(), vi.fn(), vi.fn(), factory);

    mockEs.emit("failed", { error: { code: "E_ERR", message: "err" } });

    expect(mockEs.closeCalled).toBe(true);
  });

  it("returns a stop function that closes the EventSource", () => {
    const stop = subscribeJob("job-abc", vi.fn(), vi.fn(), vi.fn(), factory);

    stop();

    expect(mockEs.closeCalled).toBe(true);
  });
});
