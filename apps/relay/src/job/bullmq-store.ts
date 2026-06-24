import type { Queue } from "bullmq";
import type { Redis } from "ioredis";
import { mapBullmqState } from "./state-map.ts";
import type { JobKind, JobRecord, JobStore } from "./types.ts";

interface JobMeta {
  kind: JobKind;
  apiKeyId: string;
  idempotencyKey: string;
  inputDigest: string;
  createdAt: string;
}

const META_TTL = 86400;
const metaKey = (jobId: string) => `jobmeta:${jobId}`;

export interface BullmqJobStoreDeps {
  redis: Redis;
  getQueue: (kind: JobKind) => Queue;
}

export function createBullmqJobStore(deps: BullmqJobStoreDeps): JobStore {
  const { redis, getQueue } = deps;

  async function get(jobId: string): Promise<JobRecord | null> {
    const raw = await redis.get(metaKey(jobId));
    if (!raw) return null;
    const meta = JSON.parse(raw) as JobMeta;
    const base = {
      jobId,
      kind: meta.kind,
      idempotencyKey: meta.idempotencyKey,
      inputDigest: meta.inputDigest,
      apiKeyId: meta.apiKeyId,
      createdAt: meta.createdAt,
    };

    const job = await getQueue(meta.kind).getJob(jobId);
    if (!job) {
      return {
        ...base,
        state: "pending",
        result: null,
        error: null,
        progress: 0,
        updatedAt: meta.createdAt,
      };
    }

    const state = mapBullmqState(await job.getState());
    const progress =
      typeof job.progress === "number" ? job.progress : state === "succeeded" ? 1 : 0;
    return {
      ...base,
      state,
      progress,
      result: state === "succeeded" ? (job.returnvalue ?? null) : null,
      error:
        state === "failed"
          ? { code: "E_RENDER_FAILED", message: job.failedReason ?? "unknown" }
          : null,
      updatedAt: new Date().toISOString(),
    };
  }

  async function upsert(record: JobRecord): Promise<void> {
    const meta: JobMeta = {
      kind: record.kind,
      apiKeyId: record.apiKeyId,
      idempotencyKey: record.idempotencyKey,
      inputDigest: record.inputDigest,
      createdAt: record.createdAt,
    };
    await redis.set(metaKey(record.jobId), JSON.stringify(meta), "EX", META_TTL);
  }

  async function findByIdempotency(
    _apiKeyId: string,
    _idempotencyKey: string
  ): Promise<JobRecord | null> {
    return null;
  }

  return { get, upsert, findByIdempotency };
}
