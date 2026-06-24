/**
 * T-034 + T-035 composition e2e (gate: Redis + chromium reachable)
 *
 * 串联 relay 应用 + BullMQ-backed jobsDeps + inline render worker：
 * POST /api/v1/jobs -> worker 渲染 -> GET /api/v1/jobs/:id 终态 succeeded + result.url。
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Worker } from "bullmq";
import { chromium } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPlaywrightPool } from "../../apps/relay/src/headless/playwright-pool.ts";
import type { PlaywrightPool } from "../../apps/relay/src/headless/playwright-pool.ts";
import { createApp } from "../../apps/relay/src/index.ts";
import { createRenderProcessor } from "../../apps/relay/src/job/render-processor.ts";
import { type JobsRuntime, createJobsRuntime } from "../../apps/relay/src/job/runtime.ts";

const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

async function isRedisReachable(): Promise<boolean> {
  const { default: Redis } = await import("ioredis");
  const r = new Redis(REDIS_URL, {
    lazyConnect: true,
    connectTimeout: 2000,
    maxRetriesPerRequest: 1,
  });
  r.on("error", () => {});
  try {
    await r.connect();
    await r.ping();
    return true;
  } catch {
    return false;
  } finally {
    r.disconnect();
  }
}

async function isChromiumReachable(): Promise<boolean> {
  try {
    const b = await chromium.launch({ headless: true, channel: "chromium" });
    await b.close();
    return true;
  } catch {
    return false;
  }
}

const infraReady = (await isRedisReachable()) && (await isChromiumReachable());
const describeE2E = infraReady ? describe : describe.skip;

describeE2E(
  "composition e2e: POST job -> worker render -> GET succeeded",
  { timeout: 40000 },
  () => {
    const url = new URL(REDIS_URL);
    const connection = {
      host: url.hostname,
      port: Number(url.port || 6379),
      maxRetriesPerRequest: null,
    };

    let redis: import("ioredis").Redis;
    let runtime: JobsRuntime;
    let pool: PlaywrightPool;
    let workers: Worker[];
    let exportDir: string;

    beforeAll(async () => {
      const { default: Redis } = await import("ioredis");
      redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
      runtime = createJobsRuntime({
        redis,
        connection: { host: connection.host, port: connection.port },
      });
      pool = createPlaywrightPool({ size: 1 });
      exportDir = await fs.mkdtemp(path.join(os.tmpdir(), "wf-e2e-exports-"));
      const processor = createRenderProcessor(pool, { exportDir });
      workers = ["bullmq-long-image-render", "bullmq-cover-render"].map(
        (q) => new Worker(q, processor, { connection })
      );
    });

    afterAll(async () => {
      await Promise.allSettled((workers ?? []).map((w) => w.close()));
      await pool?.close();
      await runtime?.close();
      await fs.rm(exportDir, { recursive: true, force: true });
      await redis?.quit();
    });

    async function pollUntilTerminal(app: ReturnType<typeof createApp>, jobId: string) {
      for (let i = 0; i < 100; i++) {
        const res = await app.request(`/api/v1/jobs/${jobId}`);
        const body = (await res.json()) as { state: string; result: { url?: string } | null };
        if (body.state === "succeeded" || body.state === "failed") return body;
        await new Promise((r) => setTimeout(r, 200));
      }
      throw new Error("job did not reach terminal state in time");
    }

    it("renders a long image end-to-end and exposes result url via GET", async () => {
      const app = createApp({ jobsDeps: runtime.jobsDeps });

      const postRes = await app.request("/api/v1/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "long-image-render",
          apiKeyId: "e2e-key",
          input: { html: "<h1 style='width:750px'>e2e long image</h1>", viewportWidth: 750 },
        }),
      });
      expect(postRes.status).toBe(200);
      const { jobId } = (await postRes.json()) as { jobId: string };
      expect(jobId).toBeTypeOf("string");

      const terminal = await pollUntilTerminal(app, jobId);
      expect(terminal.state).toBe("succeeded");
      expect(terminal.result?.url).toMatch(/^\/exports\//);

      const filename = `${jobId}.png`;
      const written = await fs.readFile(path.join(exportDir, filename));
      expect(written.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    });

    it("same Idempotency-Key returns the original jobId without enqueuing a new job", async () => {
      const app = createApp({ jobsDeps: runtime.jobsDeps });
      const body = JSON.stringify({
        kind: "long-image-render",
        apiKeyId: "e2e-idem",
        input: { html: "<h1>idem</h1>" },
      });
      const headers = {
        "content-type": "application/json",
        "idempotency-key": "e2e-idem-key-1",
      };

      const first = await app.request("/api/v1/jobs", { method: "POST", headers, body });
      const second = await app.request("/api/v1/jobs", { method: "POST", headers, body });
      const firstId = ((await first.json()) as { jobId: string }).jobId;
      const secondId = ((await second.json()) as { jobId: string }).jobId;
      expect(secondId).toBe(firstId);
    });
  }
);
