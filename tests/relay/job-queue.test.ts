/**
 * T-034: BullMQ job queue — AC-001..AC-004
 *
 * 分层策略:
 * - 纯逻辑块 (state-machine, idempotency hash, sse-bridge, routes-fake-store): 内存 fake 注入，永不 gate
 * - 真实 BullMQ/Redis 集成块: 用 REDIS_URL 可达性 gate — 不可达时 describe.skip
 */

import { EventEmitter } from "node:events";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../apps/relay/src/index.ts";
import {
  checkIdempotency,
  computeIdempotencyKey,
  registerIdempotency,
} from "../../apps/relay/src/job/idempotency.ts";
import { createSseBridge } from "../../apps/relay/src/job/sse-bridge.ts";
import { transitionState } from "../../apps/relay/src/job/state-machine.ts";
import type { IdempotencyStore, JobRecord, JobStore } from "../../apps/relay/src/job/types.ts";
import { createJobsApp } from "../../apps/relay/src/routes/jobs.ts";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

function makeJobRecord(overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    jobId: "00000000-0000-0000-0000-000000000001",
    state: "pending",
    kind: "long-image-render",
    idempotencyKey: "idem-key-test",
    inputDigest: "{}",
    result: null,
    error: null,
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    apiKeyId: "api-key-001",
    ...overrides,
  };
}

function makeMemoryJobStore(): JobStore {
  const records = new Map<string, JobRecord>();
  return {
    async get(jobId) {
      return records.get(jobId) ?? null;
    },
    async upsert(record) {
      records.set(record.jobId, { ...record });
    },
    async findByIdempotency(apiKeyId, idempotencyKey) {
      for (const r of records.values()) {
        if (r.apiKeyId === apiKeyId && r.idempotencyKey === idempotencyKey) return r;
      }
      return null;
    },
  };
}

/** In-memory Redis-like store satisfying the IdempotencyStore interface. */
function makeMemoryIdempotencyStore(): IdempotencyStore {
  const map = new Map<string, { value: string; expiresAt: number }>();
  return {
    async get(key) {
      const entry = map.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        map.delete(key);
        return null;
      }
      return entry.value;
    },
    async set(key, value, ttlSeconds) {
      map.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    },
  };
}

// ---------------------------------------------------------------------------
// AC-001 (pure logic): state-machine pending → running; route returns jobId + state:'pending'
// ---------------------------------------------------------------------------

describe("AC-001 (state-machine pure): pending → running transition", () => {
  it("transitionState from 'pending' to 'running' returns a record with state='running'", () => {
    const record = makeJobRecord({ state: "pending" });
    const updated = transitionState(record, "running");
    expect(updated.state).toBe("running");
  });

  it("transitionState preserves jobId and kind after transition", () => {
    const record = makeJobRecord({ state: "pending", kind: "long-image-render" });
    const updated = transitionState(record, "running");
    expect(updated.jobId).toBe(record.jobId);
    expect(updated.kind).toBe("long-image-render");
  });

  it("transitionState updates updatedAt to a value >= createdAt", () => {
    const record = makeJobRecord({ state: "pending" });
    const updated = transitionState(record, "running");
    const createdMs = new Date(record.createdAt).getTime();
    const updatedMs = new Date(updated.updatedAt).getTime();
    expect(updatedMs).toBeGreaterThanOrEqual(createdMs);
  });

  it("transitionState running → succeeded sets state='succeeded' and progress=1", () => {
    const record = makeJobRecord({ state: "running" });
    const updated = transitionState(record, "succeeded", {
      result: { url: "https://cdn/img.png" },
    });
    expect(updated.state).toBe("succeeded");
    expect(updated.progress).toBe(1);
  });
});

describe("AC-001 (routes fake): POST /api/v1/jobs returns {jobId}; GET /api/v1/jobs/:jobId returns state='pending'", () => {
  it("POST /api/v1/jobs enqueues a job and returns a jobId string", async () => {
    const store = makeMemoryJobStore();
    const app = createJobsApp({
      store,
      enqueue: async (kind, input, apiKeyId) => {
        const record = makeJobRecord({ kind, apiKeyId, state: "pending" });
        await store.upsert(record);
        return record.jobId;
      },
    });

    const res = await app.request("/api/v1/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "long-image-render",
        input: { articleId: "art-001" },
        apiKeyId: "k1",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { jobId: string };
    expect(typeof body.jobId).toBe("string");
    expect(body.jobId.length).toBeGreaterThan(0);
  });

  it("GET /api/v1/jobs/:jobId returns state='pending' for a newly enqueued job", async () => {
    const store = makeMemoryJobStore();
    const pendingRecord = makeJobRecord({ state: "pending", jobId: "job-pending-001" });
    await store.upsert(pendingRecord);

    const app = createJobsApp({
      store,
      enqueue: async () => "job-pending-001",
    });

    const res = await app.request("/api/v1/jobs/job-pending-001");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      jobId: string;
      state: string;
      kind: string;
      progress: number;
    };
    expect(body.state).toBe("pending");
    expect(body.jobId).toBe("job-pending-001");
    expect(body.kind).toBe("long-image-render");
    expect(typeof body.progress).toBe("number");
  });

  it("GET /api/v1/jobs/:jobId returns 404 E_NOT_FOUND for unknown jobId", async () => {
    const store = makeMemoryJobStore();
    const app = createJobsApp({
      store,
      enqueue: async () => "irrelevant",
    });

    const res = await app.request("/api/v1/jobs/non-existent-job");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_NOT_FOUND");
  });

  it("GET /api/v1/jobs/:jobId response contains all E-005 required fields", async () => {
    const store = makeMemoryJobStore();
    const record = makeJobRecord({ jobId: "job-full-fields", state: "pending" });
    await store.upsert(record);

    const app = createJobsApp({ store, enqueue: async () => "job-full-fields" });
    const res = await app.request("/api/v1/jobs/job-full-fields");
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      jobId: string;
      state: string;
      kind: string;
      progress: number;
      result: unknown;
      error: unknown;
      createdAt: string;
      updatedAt: string;
    };

    expect(body.jobId).toBe("job-full-fields");
    expect(["pending", "running", "succeeded", "failed"]).toContain(body.state);
    expect(["image-upload", "wechat-asset-upload", "long-image-render", "cover-render"]).toContain(
      body.kind
    );
    expect(typeof body.progress).toBe("number");
    expect(body.progress).toBeGreaterThanOrEqual(0);
    expect(body.progress).toBeLessThanOrEqual(1);
    expect(typeof body.createdAt).toBe("string");
    expect(new Date(body.createdAt).getTime()).toBeGreaterThan(0);
    expect(typeof body.updatedAt).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// AC-001 (state-machine): illegal transition rejection
// ---------------------------------------------------------------------------

describe("AC-001 (state-machine pure): illegal state transitions are rejected", () => {
  it("transitionState from 'pending' directly to 'succeeded' throws", () => {
    const record = makeJobRecord({ state: "pending" });
    expect(() => transitionState(record, "succeeded")).toThrow();
  });

  it("transitionState from 'succeeded' to 'running' throws (terminal state)", () => {
    const record = makeJobRecord({ state: "succeeded" });
    expect(() => transitionState(record, "running")).toThrow();
  });

  it("transitionState from 'failed' to any state throws (terminal state)", () => {
    const record = makeJobRecord({ state: "failed" });
    expect(() => transitionState(record, "running")).toThrow();
    expect(() => transitionState(record, "succeeded")).toThrow();
    expect(() => transitionState(record, "pending")).toThrow();
  });

  it("transitionState from 'running' to 'pending' throws (invalid backward transition)", () => {
    const record = makeJobRecord({ state: "running" });
    expect(() => transitionState(record, "pending")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// AC-002 (pure logic): idempotency hash calculation
// ---------------------------------------------------------------------------

describe("AC-002 (idempotency pure): computeIdempotencyKey produces deterministic sha256 hex", () => {
  it("same input and toolsetVersion produce the same key", () => {
    const input = { articleId: "art-001", width: 800 };
    const key1 = computeIdempotencyKey(input, "1.0.0");
    const key2 = computeIdempotencyKey(input, "1.0.0");
    expect(key1).toBe(key2);
  });

  it("different toolsetVersion produces a different key", () => {
    const input = { articleId: "art-001" };
    const key1 = computeIdempotencyKey(input, "1.0.0");
    const key2 = computeIdempotencyKey(input, "1.0.1");
    expect(key1).not.toBe(key2);
  });

  it("different input produces a different key", () => {
    const key1 = computeIdempotencyKey({ articleId: "art-001" }, "1.0.0");
    const key2 = computeIdempotencyKey({ articleId: "art-002" }, "1.0.0");
    expect(key1).not.toBe(key2);
  });

  it("returned key is a 64-char lowercase hex string (sha256)", () => {
    const key = computeIdempotencyKey({ x: 1 }, "1.0.0");
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it("canonicalizes input: key-order does NOT affect the hash", () => {
    const key1 = computeIdempotencyKey({ a: 1, b: 2 }, "1.0.0");
    const key2 = computeIdempotencyKey({ b: 2, a: 1 }, "1.0.0");
    expect(key1).toBe(key2);
  });
});

describe("AC-002 (idempotency pure): cache miss → registers; cache hit → returns original jobId", () => {
  it("checkIdempotency returns null on first call (cache miss)", async () => {
    const idemStore = makeMemoryIdempotencyStore();
    const result = await checkIdempotency("api-key-1", "sha256abc123", idemStore);
    expect(result).toBeNull();
  });

  it("after registerIdempotency, checkIdempotency returns original jobId (cache hit)", async () => {
    const idemStore = makeMemoryIdempotencyStore();
    const originalJobId = "job-original-001";
    await registerIdempotency("api-key-1", "sha256abc123", originalJobId, 86400, idemStore);
    const result = await checkIdempotency("api-key-1", "sha256abc123", idemStore);
    expect(result).toBe(originalJobId);
  });

  it("different apiKeyId with same digest yields separate cache entries (no cross-user hit)", async () => {
    const idemStore = makeMemoryIdempotencyStore();
    const digest = "sha256-shared-digest";
    await registerIdempotency("api-key-A", digest, "job-A-001", 86400, idemStore);
    const result = await checkIdempotency("api-key-B", digest, idemStore);
    expect(result).toBeNull();
  });

  it("Redis key follows pattern idem:{apiKeyId}:{sha256}", async () => {
    const capturedKeys: string[] = [];
    const trackingStore: IdempotencyStore = {
      async get(key) {
        capturedKeys.push(key);
        return null;
      },
      async set(key, _value, _ttl) {
        capturedKeys.push(key);
      },
    };
    await checkIdempotency("api-key-X", "deadbeef0123", trackingStore);
    await registerIdempotency("api-key-X", "deadbeef0123", "job-x-001", 86400, trackingStore);

    const expectedKey = "idem:api-key-X:deadbeef0123";
    expect(capturedKeys.some((k) => k === expectedKey)).toBe(true);
  });

  it("registerIdempotency sets TTL of 86400 seconds (24h)", async () => {
    const ttlsSet: number[] = [];
    const trackingStore: IdempotencyStore = {
      async get(_key) {
        return null;
      },
      async set(_key, _value, ttl) {
        ttlsSet.push(ttl);
      },
    };
    await registerIdempotency("api-key-1", "hash123", "job-001", 86400, trackingStore);
    expect(ttlsSet[0]).toBe(86400);
  });
});

describe("AC-002 (routes fake): second POST with same Idempotency-Key header returns original jobId", () => {
  it("second identical request returns first jobId without creating a new record", async () => {
    const store = makeMemoryJobStore();
    const idemStore = makeMemoryIdempotencyStore();
    let enqueueCount = 0;

    const app = createJobsApp({
      store,
      idemStore,
      enqueue: async (kind, input, apiKeyId) => {
        enqueueCount++;
        const record = makeJobRecord({
          kind,
          apiKeyId,
          state: "pending",
          jobId: `job-${enqueueCount}`,
        });
        await store.upsert(record);
        return record.jobId;
      },
    });

    const requestBody = JSON.stringify({
      kind: "long-image-render",
      input: { articleId: "art-X" },
      apiKeyId: "k1",
    });

    const res1 = await app.request("/api/v1/jobs", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "my-unique-key-001" },
      body: requestBody,
    });
    const body1 = (await res1.json()) as { jobId: string };

    const res2 = await app.request("/api/v1/jobs", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "my-unique-key-001" },
      body: requestBody,
    });
    const body2 = (await res2.json()) as { jobId: string };

    expect(body2.jobId).toBe(body1.jobId);
    expect(enqueueCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// AC-003 (sse-bridge pure): event emitter → SSE event sequence
// ---------------------------------------------------------------------------

describe("AC-003 (sse-bridge pure): maps job events to SSE event sequence", () => {
  it("pending→running→succeeded emits progress then succeeded events in order", async () => {
    const emitter = new EventEmitter();
    const collected: Array<{ event: string; data: unknown }> = [];

    const bridge = createSseBridge({
      emitter,
      onEvent: (event, data) => {
        collected.push({ event, data });
      },
    });

    bridge.attach("job-sse-001");

    emitter.emit("active", { jobId: "job-sse-001" });
    emitter.emit("progress", { jobId: "job-sse-001", data: 0.5 });
    emitter.emit("completed", {
      jobId: "job-sse-001",
      returnvalue: { url: "https://cdn/long.png" },
    });

    expect(collected.length).toBeGreaterThanOrEqual(2);

    const progressEvent = collected.find((e) => e.event === "progress");
    expect(progressEvent).toBeDefined();
    const progressData = progressEvent?.data as { progress: number };
    expect(progressData.progress).toBeGreaterThanOrEqual(0);
    expect(progressData.progress).toBeLessThanOrEqual(1);

    const succeededEvent = collected.find((e) => e.event === "succeeded");
    expect(succeededEvent).toBeDefined();
    const succeededData = succeededEvent?.data as { result: unknown };
    expect(succeededData.result).toBeDefined();
    expect((succeededData.result as { url: string }).url).toBe("https://cdn/long.png");
  });

  it("progress event data.progress is a number between 0 and 1 inclusive", async () => {
    const emitter = new EventEmitter();
    const collected: Array<{ event: string; data: unknown }> = [];

    const bridge = createSseBridge({
      emitter,
      onEvent: (event, data) => {
        collected.push({ event, data });
      },
    });
    bridge.attach("job-progress-range");

    emitter.emit("progress", { jobId: "job-progress-range", data: 0.75 });

    const progressEvent = collected.find((e) => e.event === "progress");
    expect(progressEvent).toBeDefined();
    const data = progressEvent?.data as { progress: number };
    expect(data.progress).toBe(0.75);
    expect(data.progress).toBeGreaterThanOrEqual(0);
    expect(data.progress).toBeLessThanOrEqual(1);
  });

  it("events for other jobIds are NOT forwarded to this bridge instance", () => {
    const emitter = new EventEmitter();
    const collected: Array<{ event: string; data: unknown }> = [];

    const bridge = createSseBridge({
      emitter,
      onEvent: (event, data) => {
        collected.push({ event, data });
      },
    });
    bridge.attach("job-mine-001");

    emitter.emit("progress", { jobId: "job-someone-elses-002", data: 0.3 });
    emitter.emit("completed", { jobId: "job-someone-elses-002", returnvalue: { url: "x" } });

    expect(collected.length).toBe(0);
  });

  it("if job is already in succeeded state at attach time, succeeded event is emitted immediately", async () => {
    const emitter = new EventEmitter();
    const collected: Array<{ event: string; data: unknown }> = [];

    const completedRecord = makeJobRecord({
      jobId: "job-pre-done",
      state: "succeeded",
      result: { url: "done.png" },
    });

    const bridge = createSseBridge({
      emitter,
      onEvent: (event, data) => {
        collected.push({ event, data });
      },
      initialRecord: completedRecord,
    });
    bridge.attach("job-pre-done");

    expect(collected.length).toBe(1);
    expect(collected[0].event).toBe("succeeded");
    const data = collected[0].data as { result: unknown };
    expect(data.result).toBeDefined();
    expect((data.result as { url: string }).url).toBe("done.png");
  });

  it("if job is in failed state at attach time, failed event is emitted immediately", async () => {
    const emitter = new EventEmitter();
    const collected: Array<{ event: string; data: unknown }> = [];

    const failedRecord = makeJobRecord({
      jobId: "job-pre-failed",
      state: "failed",
      error: { code: "E_RENDER_FAIL", message: "timeout" },
    });

    const bridge = createSseBridge({
      emitter,
      onEvent: (event, data) => {
        collected.push({ event, data });
      },
      initialRecord: failedRecord,
    });
    bridge.attach("job-pre-failed");

    expect(collected.length).toBe(1);
    expect(collected[0].event).toBe("failed");
    const data = collected[0].data as { error: { code: string; message: string } };
    expect(data.error.code).toBe("E_RENDER_FAIL");
    expect(data.error.message).toBe("timeout");
  });
});

describe("AC-003 (routes fake): GET /api/v1/jobs/:jobId/events returns text/event-stream", async () => {
  it("SSE endpoint responds with Content-Type text/event-stream", async () => {
    const store = makeMemoryJobStore();
    const record = makeJobRecord({ jobId: "sse-ct-test", state: "pending" });
    await store.upsert(record);

    const app = createJobsApp({
      store,
      enqueue: async () => "sse-ct-test",
      sseEmitter: new EventEmitter(),
    });

    const res = await app.request("/api/v1/jobs/sse-ct-test/events");
    expect(res.headers.get("content-type")).toContain("text/event-stream");
  });

  it("SSE endpoint returns 404 when jobId does not exist", async () => {
    const store = makeMemoryJobStore();
    const app = createJobsApp({
      store,
      enqueue: async () => "irrelevant",
      sseEmitter: new EventEmitter(),
    });

    const res = await app.request("/api/v1/jobs/no-such-job/events");
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// AC-004 (pure logic): running → failed updates state and error in Job store
// ---------------------------------------------------------------------------

describe("AC-004 (state-machine pure): running → failed transition", () => {
  it("transitionState from 'running' to 'failed' returns state='failed'", () => {
    const record = makeJobRecord({ state: "running" });
    const updated = transitionState(record, "failed", {
      error: { code: "E_RENDER_FAIL", message: "OOM" },
    });
    expect(updated.state).toBe("failed");
  });

  it("transitionState running → failed sets error.code and error.message", () => {
    const record = makeJobRecord({ state: "running" });
    const updated = transitionState(record, "failed", {
      error: { code: "E_RENDER_FAIL", message: "out of memory" },
    });
    expect(updated.error).toBeDefined();
    expect((updated.error as { code: string; message: string }).code).toBe("E_RENDER_FAIL");
    expect((updated.error as { code: string; message: string }).message).toBe("out of memory");
  });

  it("transitionState running → failed updates updatedAt to >= original updatedAt", () => {
    const originalUpdatedAt = new Date(Date.now() - 5000).toISOString();
    const record = makeJobRecord({ state: "running", updatedAt: originalUpdatedAt });
    const updated = transitionState(record, "failed", {
      error: { code: "E_FAIL", message: "err" },
    });
    const originalMs = new Date(originalUpdatedAt).getTime();
    const updatedMs = new Date(updated.updatedAt).getTime();
    expect(updatedMs).toBeGreaterThanOrEqual(originalMs);
  });

  it("transitionState running → failed does NOT set result field", () => {
    const record = makeJobRecord({ state: "running" });
    const updated = transitionState(record, "failed", {
      error: { code: "E_FAIL", message: "err" },
    });
    expect(updated.result).toBeNull();
  });
});

describe("AC-004 (job store): running→failed persists state and error to job store", () => {
  it("store reflects state='failed' and error object after failure transition", async () => {
    const store = makeMemoryJobStore();
    const record = makeJobRecord({ jobId: "job-fail-persist", state: "running" });
    await store.upsert(record);

    const errorPayload = { code: "E_RENDER_FAIL", message: "timeout after 30s" };
    const updated = transitionState(record, "failed", { error: errorPayload });
    await store.upsert(updated);

    const persisted = await store.get("job-fail-persist");
    expect(persisted).not.toBeNull();
    expect(persisted?.state).toBe("failed");
    expect(persisted?.error).toEqual(errorPayload);
  });

  it("store persists error with both code and message fields (E-005 error schema)", async () => {
    const store = makeMemoryJobStore();
    const record = makeJobRecord({ jobId: "job-error-schema", state: "running" });
    await store.upsert(record);

    const updated = transitionState(record, "failed", {
      error: { code: "E_QUOTA_EXCEEDED", message: "rate limit hit" },
    });
    await store.upsert(updated);

    const persisted = await store.get("job-error-schema");
    const err = persisted?.error as { code: string; message: string };
    expect(err.code).toBe("E_QUOTA_EXCEEDED");
    expect(err.message).toBe("rate limit hit");
  });
});

// ---------------------------------------------------------------------------
// BullMQ / Redis integration block (gate: REDIS_URL reachable)
// ---------------------------------------------------------------------------

async function isRedisReachable(): Promise<boolean> {
  const { default: Redis } = await import("ioredis");
  const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
  const r = new Redis(url, { lazyConnect: true, connectTimeout: 2000, maxRetriesPerRequest: 1 });
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

const redisAvailable = await isRedisReachable();

const describeIfRedis = redisAvailable ? describe : describe.skip;

describeIfRedis(
  "AC-001 (BullMQ integration): job enqueue → BullMQ queue receives job; initial state is 'waiting'",
  () => {
    let Queue: typeof import("bullmq").Queue;
    let queueName: string;
    let queue: import("bullmq").Queue;

    beforeAll(async () => {
      ({ Queue } = await import("bullmq"));
      queueName = `bullmq-long-image-render-test-${Date.now()}`;
      queue = new Queue(queueName, {
        connection: { host: "127.0.0.1", port: 6379 },
        defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 1000 } },
      });
    });

    afterAll(async () => {
      await queue.obliterate({ force: true });
      await queue.close();
    });

    it("createQueue creates a queue named 'bullmq-long-image-render'", async () => {
      const { createQueue } = await import("../../apps/relay/src/job/queue.ts");
      const q = createQueue("long-image-render", { host: "127.0.0.1", port: 6379 });
      expect(q.name).toBe("bullmq-long-image-render");
      await q.close();
    });

    it("enqueued job has attempts=3 and exponential backoff starting at 1s", async () => {
      const { createQueue } = await import("../../apps/relay/src/job/queue.ts");
      const q = createQueue("long-image-render", { host: "127.0.0.1", port: 6379 });
      const jobName = "long-image-render:api-key-001:abcd1234";
      const job = await q.add(jobName, { articleId: "art-001" });
      const jobData = await q.getJob(job.id ?? "");
      expect(jobData).not.toBeNull();
      expect(jobData?.opts?.attempts).toBe(3);
      const backoff = jobData?.opts?.backoff as { type: string; delay: number } | undefined;
      expect(backoff?.type).toBe("exponential");
      expect(backoff?.delay).toBe(1000);
      await q.obliterate({ force: true });
      await q.close();
    });

    it("job initial state in BullMQ is 'waiting' (maps to pending)", async () => {
      const { createQueue } = await import("../../apps/relay/src/job/queue.ts");
      const q = createQueue("long-image-render", { host: "127.0.0.1", port: 6379 });
      const job = await q.add("long-image-render:k1:aaaa0000", { articleId: "art-X" });
      const state = await job.getState();
      expect(state).toBe("waiting");
      await q.obliterate({ force: true });
      await q.close();
    });
  }
);

describeIfRedis("AC-002 (Redis integration): idempotency TTL ≈ 86400s via real Redis", () => {
  let Redis: typeof import("ioredis").default;
  let client: import("ioredis").default;
  const testKeyPrefix = `idem:integration-test-${Date.now()}`;

  beforeAll(async () => {
    ({ default: Redis } = await import("ioredis"));
    client = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
  });

  afterAll(async () => {
    const keys = await client.keys(`${testKeyPrefix}*`);
    if (keys.length > 0) await client.del(...keys);
    await client.quit();
  });

  it("registerIdempotency sets a key with TTL between 86390 and 86400 in real Redis", async () => {
    const { registerIdempotency } = await import("../../apps/relay/src/job/idempotency.ts");
    const ioredisModule = await import("ioredis");
    const IRedis = ioredisModule.default;
    const redis = new IRedis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");

    const redisStore: IdempotencyStore = {
      async get(key) {
        const val = await redis.get(key);
        return val;
      },
      async set(key, value, ttlSeconds) {
        await redis.set(key, value, "EX", ttlSeconds);
      },
    };

    const apiKeyId = `integration-ak-${Date.now()}`;
    const digest = "deadbeef1234abcd".repeat(4);
    const jobId = "job-redis-001";

    await registerIdempotency(apiKeyId, digest, jobId, 86400, redisStore);

    const expectedKey = `idem:${apiKeyId}:${digest}`;
    const ttl = await redis.ttl(expectedKey);
    expect(ttl).toBeGreaterThan(86390);
    expect(ttl).toBeLessThanOrEqual(86400);

    const stored = await redis.get(expectedKey);
    expect(stored).toBe(jobId);

    await redis.del(expectedKey);
    await redis.quit();
  });

  it("second request with same key returns original jobId from Redis", async () => {
    const { checkIdempotency, registerIdempotency } = await import(
      "../../apps/relay/src/job/idempotency.ts"
    );
    const ioredisModule2 = await import("ioredis");
    const IRedis = ioredisModule2.default;
    const redis = new IRedis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");

    const redisStore: IdempotencyStore = {
      async get(key) {
        return redis.get(key);
      },
      async set(key, value, ttlSeconds) {
        await redis.set(key, value, "EX", ttlSeconds);
      },
    };

    const apiKeyId = `integration-ak2-${Date.now()}`;
    const digest = `cafebabe${"0".repeat(56)}`;
    const originalJobId = "job-original-redis-002";

    const firstCheck = await checkIdempotency(apiKeyId, digest, redisStore);
    expect(firstCheck).toBeNull();

    await registerIdempotency(apiKeyId, digest, originalJobId, 86400, redisStore);

    const secondCheck = await checkIdempotency(apiKeyId, digest, redisStore);
    expect(secondCheck).toBe(originalJobId);

    const key = `idem:${apiKeyId}:${digest}`;
    await redis.del(key);
    await redis.quit();
  });
});

// ---------------------------------------------------------------------------
// AC-001 (wiring): createApp mounts the jobs sub-app when jobsDeps provided
// ---------------------------------------------------------------------------

describe("AC-001 wiring: jobs routes are reachable through createApp app tree", () => {
  it("createApp({ jobsDeps }) serves GET /api/v1/jobs/:jobId", async () => {
    const store = makeMemoryJobStore();
    await store.upsert(makeJobRecord({ jobId: "wired-job-1", state: "pending" }));

    const app = createApp({ jobsDeps: { store, enqueue: async () => "wired-job-1" } });

    const res = await app.request("/api/v1/jobs/wired-job-1");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { jobId: string; state: string };
    expect(body.jobId).toBe("wired-job-1");
    expect(body.state).toBe("pending");
  });

  it("createApp without jobsDeps does not mount jobs routes (404)", async () => {
    const app = createApp({});
    const res = await app.request("/api/v1/jobs/anything");
    expect(res.status).toBe(404);
  });
});
