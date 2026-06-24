import { describe, expect, it } from "vitest";
import type { JobsClient } from "../../../apps/mcp-server/src/jobs/client.ts";
import { exportCoverTool } from "../../../apps/mcp-server/src/tools/export-cover.ts";
import { exportLongImageTool } from "../../../apps/mcp-server/src/tools/export-long-image.ts";
import { getJobTool } from "../../../apps/mcp-server/src/tools/get-job.ts";
import { uploadImageTool } from "../../../apps/mcp-server/src/tools/upload-image.ts";

function makeMockClient(): JobsClient & {
  jobs: Map<string, { status: string; result?: { url: string } }>;
} {
  const jobs = new Map<string, { status: string; result?: { url: string } }>();
  const idempotencyIndex = new Map<string, string>();
  let counter = 0;

  return {
    jobs,
    async enqueue(
      _kind: string,
      _payload: unknown,
      opts?: { idempotencyKey?: string }
    ): Promise<{ jobId: string }> {
      if (opts?.idempotencyKey && idempotencyIndex.has(opts.idempotencyKey)) {
        return { jobId: idempotencyIndex.get(opts.idempotencyKey) ?? "" };
      }
      const jobId = `job-${++counter}`;
      jobs.set(jobId, { status: "pending" });
      if (opts?.idempotencyKey) {
        idempotencyIndex.set(opts.idempotencyKey, jobId);
      }
      return { jobId };
    },
    async getJob(jobId: string): Promise<{
      status: "pending" | "running" | "succeeded" | "failed";
      result?: { url: string };
      error?: string;
    }> {
      const job = jobs.get(jobId);
      if (!job) return { status: "failed", error: "not found" };
      return job as {
        status: "pending" | "running" | "succeeded" | "failed";
        result?: { url: string };
      };
    },
  };
}

// ---- AC-001: export_long_image returns jobId immediately ----

describe("AC-001: exportLongImageTool returns jobId without blocking", () => {
  it("returns an object with a non-empty jobId string", async () => {
    const client = makeMockClient();
    const result = await exportLongImageTool(client)({ markdown: "# Hello", themeId: "default" });
    expect(typeof (result as Record<string, unknown>).jobId).toBe("string");
    expect(((result as Record<string, unknown>).jobId as string).length).toBeGreaterThan(0);
  });

  it("does not block: resolves before job is complete (status stays pending)", async () => {
    const client = makeMockClient();
    const result = await exportLongImageTool(client)({
      markdown: "# Async test",
      themeId: "default",
    });
    const jobId = (result as Record<string, unknown>).jobId as string;
    const jobState = await client.getJob(jobId);
    expect(jobState.status).toBe("pending");
  });
});

// ---- AC-002: get_job returns status + optional result ----

describe("AC-002: getJobTool returns status field", () => {
  it("returns pending status for a newly enqueued job", async () => {
    const client = makeMockClient();
    const enqueueResult = await exportLongImageTool(client)({
      markdown: "# Test",
      themeId: "default",
    });
    const jobId = (enqueueResult as Record<string, unknown>).jobId as string;

    const result = await getJobTool(client)({ jobId });
    expect(typeof (result as Record<string, unknown>).status).toBe("string");
    const validStatuses = ["pending", "running", "succeeded", "failed"];
    expect(validStatuses).toContain((result as Record<string, unknown>).status);
  });

  it("returns succeeded status with result.url when job completes", async () => {
    const client = makeMockClient();
    const enqueueResult = await exportLongImageTool(client)({ markdown: "# Test" });
    const jobId = (enqueueResult as Record<string, unknown>).jobId as string;

    client.jobs.set(jobId, {
      status: "succeeded",
      result: { url: "https://cdn.example.com/img.png" },
    });

    const result = (await getJobTool(client)({ jobId })) as Record<string, unknown>;
    expect(result.status).toBe("succeeded");
    expect((result.result as Record<string, unknown>).url).toBe("https://cdn.example.com/img.png");
  });
});

// ---- AC-003: idempotency — same key returns same jobId ----

describe("AC-003: export_long_image idempotency — same key yields same jobId", () => {
  it("two calls with the same idempotencyKey return the same jobId", async () => {
    const client = makeMockClient();
    const args = { markdown: "# Idempotent", themeId: "default", idempotencyKey: "key-abc" };

    const first = (await exportLongImageTool(client)(args)) as Record<string, unknown>;
    const second = (await exportLongImageTool(client)(args)) as Record<string, unknown>;

    expect(second.jobId).toBe(first.jobId);
  });

  it("two calls without idempotencyKey create distinct jobs", async () => {
    const client = makeMockClient();
    const args = { markdown: "# No key", themeId: "default" };

    const first = (await exportLongImageTool(client)(args)) as Record<string, unknown>;
    const second = (await exportLongImageTool(client)(args)) as Record<string, unknown>;

    expect(second.jobId).not.toBe(first.jobId);
  });
});

// ---- export_cover: enqueues cover render job and returns jobId ----

describe("export_cover: enqueues cover render job and returns jobId", () => {
  it("returns jobId for a cover export job", async () => {
    const client = makeMockClient();
    const result = (await exportCoverTool(client)({
      markdown: "# Cover Title",
      themeId: "default",
      coverStyle: "square",
    })) as Record<string, unknown>;

    expect(typeof result.jobId).toBe("string");
    expect((result.jobId as string).length).toBeGreaterThan(0);
  });

  it("cover export idempotency works with same key", async () => {
    const client = makeMockClient();
    const args = { markdown: "# Cover", themeId: "default", idempotencyKey: "cover-key-1" };

    const first = (await exportCoverTool(client)(args)) as Record<string, unknown>;
    const second = (await exportCoverTool(client)(args)) as Record<string, unknown>;

    expect(second.jobId).toBe(first.jobId);
  });
});

// ---- upload_image: enqueues image upload job and returns jobId ----

describe("upload_image: enqueues image upload job and returns jobId", () => {
  it("returns jobId for an image upload job", async () => {
    const client = makeMockClient();
    const result = (await uploadImageTool(client)({
      url: "https://example.com/image.png",
    })) as Record<string, unknown>;

    expect(typeof result.jobId).toBe("string");
    expect((result.jobId as string).length).toBeGreaterThan(0);
  });

  it("upload_image idempotency works with same key", async () => {
    const client = makeMockClient();
    const args = { url: "https://example.com/img.png", idempotencyKey: "upload-key-1" };

    const first = (await uploadImageTool(client)(args)) as Record<string, unknown>;
    const second = (await uploadImageTool(client)(args)) as Record<string, unknown>;

    expect(second.jobId).toBe(first.jobId);
  });
});
