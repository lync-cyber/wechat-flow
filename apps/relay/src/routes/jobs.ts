import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import {
  checkIdempotency,
  computeIdempotencyKey,
  registerIdempotency,
} from "../job/idempotency.ts";
import { createSseBridge } from "../job/sse-bridge.ts";
import type { JobKind, JobsAppDeps } from "../job/types.ts";

export function createJobsApp(deps: JobsAppDeps): Hono {
  const { store, enqueue, idemStore, sseEmitter } = deps;
  const app = new Hono();

  app.post("/api/v1/jobs", async (c) => {
    let body: { kind: JobKind; input: unknown; apiKeyId: string };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: { code: "E_INVALID_JSON", message: "invalid json" } }, 400);
    }

    const { kind, input, apiKeyId } = body;
    const idempotencyKeyHeader = c.req.header("idempotency-key");

    if (idempotencyKeyHeader && idemStore) {
      const digest = computeIdempotencyKey(
        { kind, input, apiKeyId, key: idempotencyKeyHeader },
        "1.0.0"
      );
      const existingJobId = await checkIdempotency(apiKeyId, digest, idemStore);
      if (existingJobId) {
        return c.json({ jobId: existingJobId }, 200);
      }

      const jobId = await enqueue(kind, input, apiKeyId);
      await registerIdempotency(apiKeyId, digest, jobId, 86400, idemStore);
      return c.json({ jobId }, 200);
    }

    const jobId = await enqueue(kind, input, apiKeyId);
    return c.json({ jobId }, 200);
  });

  app.get("/api/v1/jobs/:jobId", async (c) => {
    const { jobId } = c.req.param();
    const record = await store.get(jobId);
    if (!record) {
      return c.json({ error: { code: "E_NOT_FOUND", message: "job not found" } }, 404);
    }
    return c.json(
      {
        jobId: record.jobId,
        state: record.state,
        kind: record.kind,
        progress: record.progress,
        result: record.result ?? null,
        error: record.error ?? null,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
      200
    );
  });

  app.get("/api/v1/jobs/:jobId/events", async (c) => {
    const { jobId } = c.req.param();
    const record = await store.get(jobId);
    if (!record) {
      return c.json({ error: { code: "E_NOT_FOUND", message: "job not found" } }, 404);
    }

    const emitter = sseEmitter;

    return streamSSE(c, async (stream) => {
      await new Promise<void>((resolve) => {
        const bridge = createSseBridge({
          emitter: emitter ?? ({ on: () => {}, off: () => {}, emit: () => false } as never),
          onEvent: (event, data) => {
            stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => {});
            if (event === "succeeded" || event === "failed") {
              resolve();
            }
          },
          initialRecord: record,
        });
        bridge.attach(jobId);

        stream.onAbort(() => {
          bridge.detach();
          resolve();
        });
      });
    });
  });

  return app;
}
