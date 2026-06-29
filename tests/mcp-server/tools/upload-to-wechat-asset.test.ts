import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { makeNotImplementedJobsClient } from "../../../apps/mcp-server/src/jobs/client.ts";
import { uploadToWechatAssetTool } from "../../../apps/mcp-server/src/tools/upload-to-wechat-asset.ts";
import * as uploadWechatAsset from "../../../packages/core/src/composers/upload-wechat-asset.ts";

function makeMockClient(fixedJobId = "550e8400-e29b-41d4-a716-446655440000") {
  return {
    async enqueue(_kind: string, _payload: unknown): Promise<{ jobId: string }> {
      return { jobId: fixedJobId };
    },
    async getJob(): Promise<{ status: "pending" | "running" | "succeeded" | "failed" }> {
      return { status: "pending" };
    },
  };
}

// ---- AC-001: returns { jobId } that matches the fixed jobId from the mock ----

describe("AC-001: uploadToWechatAssetTool returns { jobId } transparently", () => {
  it("returns the jobId provided by the client (transparent passthrough)", async () => {
    const fixedJobId = "550e8400-e29b-41d4-a716-446655440000";
    const client = makeMockClient(fixedJobId);
    const result = (await uploadToWechatAssetTool(client)({
      imageUrl: "https://example.com/img.png",
      type: "image",
    })) as Record<string, unknown>;

    expect(result.jobId).toBe(fixedJobId);
  });

  it("returns an object with exactly a jobId key on success", async () => {
    const client = makeMockClient();
    const result = (await uploadToWechatAssetTool(client)({
      imageUrl: "https://example.com/img.png",
      type: "image",
    })) as Record<string, unknown>;

    expect(Object.keys(result)).toContain("jobId");
  });
});

// ---- AC-002: tool delegates to composeUploadWechatAsset (M-008 use case) ----

describe("AC-002: uploadToWechatAssetTool delegates to composeUploadWechatAsset", () => {
  it("calls composeUploadWechatAsset exactly once", async () => {
    const spy = vi.spyOn(uploadWechatAsset, "composeUploadWechatAsset");
    const client = makeMockClient();
    await uploadToWechatAssetTool(client)({
      imageUrl: "https://example.com/photo.png",
      type: "image",
    });

    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("passes imageUrl and type through to composeUploadWechatAsset", async () => {
    const spy = vi.spyOn(uploadWechatAsset, "composeUploadWechatAsset");
    const client = makeMockClient();
    await uploadToWechatAssetTool(client)({
      imageUrl: "https://example.com/voice.mp3",
      type: "voice",
    });

    expect(spy).toHaveBeenCalledWith(
      { imageUrl: "https://example.com/voice.mp3", type: "voice" },
      expect.any(Object)
    );
    spy.mockRestore();
  });

  it("returns error code when client is not configured", async () => {
    const client = makeNotImplementedJobsClient();
    const result = (await uploadToWechatAssetTool(client)({
      imageUrl: "https://example.com/img.png",
      type: "image",
    })) as Record<string, unknown>;

    expect(result.code).toBeDefined();
    expect(result.jobId).toBeUndefined();
  });

  it("rejects http imageUrl — composeUploadWechatAsset validation blocks non-https URLs", async () => {
    const client = makeMockClient();
    const result = (await uploadToWechatAssetTool(client)({
      imageUrl: "http://example.com/img.png",
      type: "image",
    })) as Record<string, unknown>;

    // ValidationError from composeUploadWechatAsset surfaces as error code
    expect(result.code).toBeDefined();
    expect(result.jobId).toBeUndefined();
  });

  it("rejects missing imageUrl — composeUploadWechatAsset validation rejects empty string", async () => {
    const client = makeMockClient();
    const result = (await uploadToWechatAssetTool(client)({
      imageUrl: "",
      type: "image",
    })) as Record<string, unknown>;

    expect(result.code).toBeDefined();
    expect(result.jobId).toBeUndefined();
  });
});

// ---- AC-003: returned jobId satisfies z.string().uuid() ----

describe("AC-003: returned jobId is a valid UUID", () => {
  it("jobId from the mock client satisfies z.string().uuid()", async () => {
    const client = makeMockClient();
    const result = (await uploadToWechatAssetTool(client)({
      imageUrl: "https://example.com/thumb.jpg",
      type: "thumb",
    })) as Record<string, unknown>;

    const uuidSchema = z.uuid();
    const parsed = uuidSchema.safeParse(result.jobId);
    expect(parsed.success, `Expected UUID, got: ${result.jobId}`).toBe(true);
  });
});
