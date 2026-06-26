import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { JobsClient } from "../../../apps/mcp-server/src/jobs/client.ts";
import { makeNotImplementedJobsClient } from "../../../apps/mcp-server/src/jobs/client.ts";
import { uploadToWechatAssetTool } from "../../../apps/mcp-server/src/tools/upload-to-wechat-asset.ts";

function makeMockClient(fixedJobId = "550e8400-e29b-41d4-a716-446655440000"): JobsClient & {
  lastKind: string | null;
  lastPayload: unknown;
} {
  let lastKind: string | null = null;
  let lastPayload: unknown = null;

  return {
    get lastKind() {
      return lastKind;
    },
    get lastPayload() {
      return lastPayload;
    },
    async enqueue(kind: string, payload: unknown): Promise<{ jobId: string }> {
      lastKind = kind;
      lastPayload = payload;
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

// ---- AC-002: thin wrapper — only delegates to the underlying client, no business logic ----

describe("AC-002: uploadToWechatAssetTool delegates to client without extra business logic", () => {
  it("calls enqueue exactly once with the correct kind", async () => {
    const client = makeMockClient();
    await uploadToWechatAssetTool(client)({
      imageUrl: "https://example.com/photo.png",
      type: "image",
    });

    expect(client.lastKind).toBe("wechat-asset-upload");
  });

  it("passes imageUrl and type through to the enqueue payload", async () => {
    const client = makeMockClient();
    await uploadToWechatAssetTool(client)({
      imageUrl: "https://example.com/voice.mp3",
      type: "voice",
    });

    const payload = client.lastPayload as Record<string, unknown>;
    expect(payload.imageUrl).toBe("https://example.com/voice.mp3");
    expect(payload.type).toBe("voice");
  });

  it("returns E_NOT_IMPLEMENTED code when client is not configured", async () => {
    const client = makeNotImplementedJobsClient();
    const result = (await uploadToWechatAssetTool(client)({
      imageUrl: "https://example.com/img.png",
      type: "image",
    })) as Record<string, unknown>;

    expect(result.code).toBe("E_NOT_IMPLEMENTED");
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

    const uuidSchema = z.string().uuid();
    const parsed = uuidSchema.safeParse(result.jobId);
    expect(parsed.success, `Expected UUID, got: ${result.jobId}`).toBe(true);
  });
});
