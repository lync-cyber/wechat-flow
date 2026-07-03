import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../apps/relay/src/index.ts";
import { ALL_JOB_KINDS } from "../../apps/relay/src/job/types.ts";
import { createMetricsApp } from "../../apps/relay/src/routes/metrics.ts";

describe("ALL_JOB_KINDS: full JobKind enum for queue-depth iteration", () => {
  it("contains exactly the four known job kinds", () => {
    expect([...ALL_JOB_KINDS].sort()).toEqual(
      ["cover-render", "image-upload", "long-image-render", "wechat-asset-upload"].sort()
    );
  });
});

function makeFakeQueueDepths(depths: Record<string, number>) {
  return async () => depths;
}

describe("GET /metrics: job_queue_depth Prometheus gauge", () => {
  it('returns 200 with text containing job_queue_depth{kind="long-image-render"} 3', async () => {
    const app = createMetricsApp({
      queueDepths: makeFakeQueueDepths({
        "image-upload": 0,
        "wechat-asset-upload": 0,
        "long-image-render": 3,
        "cover-render": 0,
      }),
    });

    const res = await app.request("/metrics");
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('job_queue_depth{kind="long-image-render"} 3');
  });

  it("emits a separate series per kind label", async () => {
    const app = createMetricsApp({
      queueDepths: makeFakeQueueDepths({
        "image-upload": 1,
        "wechat-asset-upload": 2,
        "long-image-render": 3,
        "cover-render": 4,
      }),
    });

    const res = await app.request("/metrics");
    const text = await res.text();
    expect(text).toContain('job_queue_depth{kind="image-upload"} 1');
    expect(text).toContain('job_queue_depth{kind="wechat-asset-upload"} 2');
    expect(text).toContain('job_queue_depth{kind="long-image-render"} 3');
    expect(text).toContain('job_queue_depth{kind="cover-render"} 4');
  });

  it("response content-type is the Prometheus text exposition format", async () => {
    const app = createMetricsApp({ queueDepths: makeFakeQueueDepths({}) });
    const res = await app.request("/metrics");
    expect(res.headers.get("content-type")).toContain("text/plain");
  });
});

describe("createApp wiring: /metrics mounted only when deps.metrics is provided", () => {
  it("createApp({ metrics }) serves GET /metrics with job_queue_depth series", async () => {
    const app = createApp({
      metrics: { queueDepths: makeFakeQueueDepths({ "long-image-render": 5 }) },
    });
    const res = await app.request("/metrics");
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('job_queue_depth{kind="long-image-render"} 5');
  });

  it("createApp without metrics deps does not mount /metrics (404)", async () => {
    const app = createApp({});
    const res = await app.request("/metrics");
    expect(res.status).toBe(404);
  });

  it("GET /metrics is reachable with no authorization header (not gated by auth middleware)", async () => {
    const app = createApp({
      metrics: { queueDepths: makeFakeQueueDepths({ "long-image-render": 1 }) },
    });
    const res = await app.request("/metrics");
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// createJobsRuntime.queueDepths(): real BullMQ/Redis integration (gate: REDIS_URL reachable)
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

describeIfRedis("createJobsRuntime.queueDepths(): BullMQ integration", () => {
  let Redis: typeof import("ioredis").default;
  let redis: import("ioredis").default;
  let runtime: import("../../apps/relay/src/job/runtime.ts").JobsRuntime;

  beforeAll(async () => {
    ({ default: Redis } = await import("ioredis"));
    redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
    const { createJobsRuntime } = await import("../../apps/relay/src/job/runtime.ts");
    runtime = createJobsRuntime({
      redis,
      connection: { host: "127.0.0.1", port: 6379 },
    });
  });

  afterAll(async () => {
    await runtime.close();
    await redis.quit();
  });

  it("returns a depth entry for every ALL_JOB_KINDS member", async () => {
    const depths = await runtime.queueDepths();
    for (const kind of ALL_JOB_KINDS) {
      expect(typeof depths[kind]).toBe("number");
    }
  });
});
