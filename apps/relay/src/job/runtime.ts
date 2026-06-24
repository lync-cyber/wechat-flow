import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { type Queue, QueueEvents } from "bullmq";
import type { Redis } from "ioredis";
import { createBullmqJobStore } from "./bullmq-store.ts";
import { computeIdempotencyKey } from "./idempotency.ts";
import { type QueueConnection, createQueue } from "./queue.ts";
import type { IdempotencyStore, JobKind, JobsAppDeps } from "./types.ts";

const RENDER_KINDS: JobKind[] = ["long-image-render", "cover-render"];

export interface JobsRuntime {
  jobsDeps: JobsAppDeps;
  close(): Promise<void>;
}

export function createJobsRuntime(opts: {
  redis: Redis;
  connection: QueueConnection;
}): JobsRuntime {
  const { redis, connection } = opts;

  const queues = new Map<JobKind, Queue>();
  const getQueue = (kind: JobKind): Queue => {
    const existing = queues.get(kind);
    if (existing) return existing;
    const queue = createQueue(kind, connection);
    queues.set(kind, queue);
    return queue;
  };

  const store = createBullmqJobStore({ redis, getQueue });

  const idemStore: IdempotencyStore = {
    get: (key) => redis.get(key),
    set: async (key, value, ttlSeconds) => {
      await redis.set(key, value, "EX", ttlSeconds);
    },
  };

  const sseEmitter = new EventEmitter();
  const queueEvents = RENDER_KINDS.map((kind) => {
    const qe = new QueueEvents(`bullmq-${kind}`, { connection });
    qe.on("active", ({ jobId }) => sseEmitter.emit("active", { jobId }));
    qe.on("progress", ({ jobId, data }) => sseEmitter.emit("progress", { jobId, data }));
    qe.on("completed", ({ jobId, returnvalue }) =>
      sseEmitter.emit("completed", { jobId, returnvalue })
    );
    qe.on("failed", ({ jobId, failedReason }) =>
      sseEmitter.emit("failed", { jobId, failedReason })
    );
    return qe;
  });

  const enqueue = async (kind: JobKind, input: unknown, apiKeyId: string): Promise<string> => {
    const jobId = randomUUID();
    const idempotencyKey = computeIdempotencyKey({ kind, input, apiKeyId }, "1.0.0");
    const now = new Date().toISOString();
    await store.upsert({
      jobId,
      state: "pending",
      kind,
      idempotencyKey,
      inputDigest: idempotencyKey,
      result: null,
      error: null,
      progress: 0,
      createdAt: now,
      updatedAt: now,
      apiKeyId,
    });
    const jobName = `${kind}:${apiKeyId}:${jobId.slice(0, 8)}`;
    await getQueue(kind).add(
      jobName,
      { kind, apiKeyId, input, filename: `${jobId}.png` },
      { jobId }
    );
    return jobId;
  };

  const jobsDeps: JobsAppDeps = { store, enqueue, idemStore, sseEmitter };

  const close = async (): Promise<void> => {
    await Promise.allSettled([
      ...[...queues.values()].map((q) => q.close()),
      ...queueEvents.map((qe) => qe.close()),
    ]);
  };

  return { jobsDeps, close };
}
