/**
 * Worker bring-up e2e (gate: Redis + chromium reachable)
 *
 * relay 应用 in-process 入队，独立 job-worker 进程（与 Dockerfile CMD 相同的
 * bootstrap）经 Redis 消费：POST /api/v1/jobs -> worker 进程渲染 -> GET 终态
 * succeeded，PNG 落盘 worker cwd 默认 exportDir（public/exports）。
 */
import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../apps/relay/src/index.ts";
import { type JobsRuntime, createJobsRuntime } from "../../apps/relay/src/job/runtime.ts";

const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const HOOK_TIMEOUT_MS = 60_000;

const repoRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const workerEntry = path.join(repoRoot, "apps", "job-worker", "src", "index.ts");

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
  "worker bring-up e2e: POST job -> 独立 job-worker 进程消费 -> GET succeeded",
  { timeout: 90_000 },
  () => {
    let redis: import("ioredis").Redis;
    let runtime: JobsRuntime;
    let worker: ChildProcess;
    let workerCwd: string;
    let stderrBuf = "";

    beforeAll(async () => {
      const url = new URL(REDIS_URL);
      const { default: Redis } = await import("ioredis");
      redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
      runtime = createJobsRuntime({
        redis,
        connection: { host: url.hostname, port: Number(url.port || 6379) },
      });

      // 临时 cwd：worker 未显式传 exportDir，产物落 <cwd>/public/exports，避免污染仓库。
      workerCwd = await fs.mkdtemp(path.join(os.tmpdir(), "wf-worker-e2e-"));
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        REDIS_URL,
        RENDER_POOL_SIZE: "1",
      };
      worker = spawn(process.execPath, ["--experimental-strip-types", workerEntry], {
        cwd: workerCwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });
      worker.stderr?.on("data", (chunk: Buffer) => {
        stderrBuf += chunk.toString();
      });
    }, HOOK_TIMEOUT_MS);

    afterAll(async () => {
      if (worker && worker.exitCode === null) {
        if (process.platform === "win32" && worker.pid) {
          // Windows 上 kill() 不终止子进程树；taskkill /T 连带 chromium 池一起回收。
          spawn("taskkill", ["/pid", String(worker.pid), "/T", "/F"], { stdio: "ignore" });
        } else {
          worker.kill("SIGTERM");
        }
        await once(worker, "exit");
      }
      await runtime?.close();
      await redis?.quit();
      await fs.rm(workerCwd, { recursive: true, force: true });
    }, HOOK_TIMEOUT_MS);

    async function pollUntilTerminal(app: ReturnType<typeof createApp>, jobId: string) {
      for (let i = 0; i < 150; i++) {
        if (worker.exitCode !== null) {
          throw new Error(
            `job-worker 进程提前退出，exit code ${worker.exitCode}\nstderr:\n${stderrBuf}`
          );
        }
        const res = await app.request(`/api/v1/jobs/${jobId}`);
        const body = (await res.json()) as {
          state: string;
          result: { url?: string } | null;
          error: { code: string; message: string } | null;
        };
        if (body.state === "succeeded" || body.state === "failed") return body;
        await new Promise((r) => setTimeout(r, 400));
      }
      throw new Error(`job 未在限时内到达终态\nstderr:\n${stderrBuf}`);
    }

    it("long-image-render 由独立 worker 进程消费至 succeeded 且 PNG 落默认 exportDir", async () => {
      const app = createApp({ jobsDeps: runtime.jobsDeps });

      const postRes = await app.request("/api/v1/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "long-image-render",
          apiKeyId: "worker-e2e-key",
          input: {
            html: "<h1 style='width:750px'>worker process e2e</h1>",
            viewportWidth: 750,
          },
        }),
      });
      expect(postRes.status).toBe(200);
      const { jobId } = (await postRes.json()) as { jobId: string };

      const terminal = await pollUntilTerminal(app, jobId);
      expect(terminal.error).toBeNull();
      expect(terminal.state).toBe("succeeded");
      expect(terminal.result?.url).toBe(`/exports/${jobId}.png`);

      const written = await fs.readFile(path.join(workerCwd, "public", "exports", `${jobId}.png`));
      expect(written.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    });
  }
);
