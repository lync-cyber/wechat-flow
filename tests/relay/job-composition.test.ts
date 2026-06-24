import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PlaywrightPool } from "../../apps/relay/src/headless/playwright-pool.ts";
import {
  type RenderJob,
  createRenderProcessor,
} from "../../apps/relay/src/job/render-processor.ts";
import { mapBullmqState } from "../../apps/relay/src/job/state-map.ts";

// ---------------------------------------------------------------------------
// mapBullmqState: BullMQ lifecycle state -> E-005 JobState
// ---------------------------------------------------------------------------

describe("mapBullmqState: BullMQ state -> E-005 JobState", () => {
  it("maps 'active' to 'running'", () => {
    expect(mapBullmqState("active")).toBe("running");
  });

  it("maps 'completed' to 'succeeded'", () => {
    expect(mapBullmqState("completed")).toBe("succeeded");
  });

  it("maps 'failed' to 'failed'", () => {
    expect(mapBullmqState("failed")).toBe("failed");
  });

  it("maps 'waiting'/'delayed'/unknown to 'pending'", () => {
    expect(mapBullmqState("waiting")).toBe("pending");
    expect(mapBullmqState("delayed")).toBe("pending");
    expect(mapBullmqState("waiting-children")).toBe("pending");
  });
});

// ---------------------------------------------------------------------------
// createRenderProcessor: kind dispatch + persist + progress (fake pool, no chromium)
// ---------------------------------------------------------------------------

function makeFakePool(): PlaywrightPool {
  const fakePage = {
    setViewportSize: async () => {},
    setContent: async () => {},
    screenshot: async () => Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  } as unknown as Page;
  return {
    withPage: (fn) => fn(fakePage),
    close: async () => {},
  };
}

function makeJob(data: RenderJob["data"]): RenderJob & { progressCalls: number[] } {
  const progressCalls: number[] = [];
  return {
    data,
    progressCalls,
    updateProgress: async (p: number) => {
      progressCalls.push(p);
    },
  };
}

describe("createRenderProcessor: dispatch by kind, persist, report progress", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "wf-proc-test-"));
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("long-image-render writes a file and returns url '/exports/<filename>'", async () => {
    const proc = createRenderProcessor(makeFakePool(), { exportDir: tmpDir });
    const job = makeJob({
      kind: "long-image-render",
      apiKeyId: "k1",
      filename: "li.png",
      input: { html: "<h1>x</h1>", viewportWidth: 750 },
    });

    const result = await proc(job);

    expect(result.url).toBe("/exports/li.png");
    const written = await fs.readFile(path.join(tmpDir, "li.png"));
    expect(written.length).toBeGreaterThan(0);
  });

  it("cover-render writes a file and returns url", async () => {
    const proc = createRenderProcessor(makeFakePool(), { exportDir: tmpDir });
    const job = makeJob({
      kind: "cover-render",
      apiKeyId: "k1",
      filename: "cv.png",
      input: { html: "<h1>x</h1>", format: "landscape" },
    });

    const result = await proc(job);
    expect(result.url).toBe("/exports/cv.png");
  });

  it("reports progress 0.1 -> 0.8 -> 1 over the render lifecycle", async () => {
    const proc = createRenderProcessor(makeFakePool(), { exportDir: tmpDir });
    const job = makeJob({
      kind: "long-image-render",
      apiKeyId: "k1",
      filename: "prog.png",
      input: { html: "<h1>x</h1>" },
    });

    await proc(job);
    expect(job.progressCalls).toEqual([0.1, 0.8, 1]);
  });

  it("cover-render without format throws", async () => {
    const proc = createRenderProcessor(makeFakePool(), { exportDir: tmpDir });
    const job = makeJob({
      kind: "cover-render",
      apiKeyId: "k1",
      filename: "bad.png",
      input: { html: "<h1>x</h1>" },
    });

    await expect(proc(job)).rejects.toThrow("format");
  });

  it("unsupported kind throws", async () => {
    const proc = createRenderProcessor(makeFakePool(), { exportDir: tmpDir });
    const job = makeJob({
      kind: "image-upload",
      apiKeyId: "k1",
      filename: "no.png",
      input: { html: "<h1>x</h1>" },
    });

    await expect(proc(job)).rejects.toThrow("unsupported render kind");
  });
});
