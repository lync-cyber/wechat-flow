import { createPlaywrightPool, createRenderProcessor } from "@wechat-flow/relay";
import { Worker } from "bullmq";

const REDIS_URL = new URL(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
const POOL_SIZE = Number(process.env.RENDER_POOL_SIZE ?? 2);

const connection = {
  host: REDIS_URL.hostname,
  port: Number(REDIS_URL.port || 6379),
  maxRetriesPerRequest: null,
};

const pool = createPlaywrightPool({ size: POOL_SIZE });
const processor = createRenderProcessor(pool);

const workers = ["bullmq-long-image-render", "bullmq-cover-render"].map(
  (queueName) => new Worker(queueName, processor, { connection })
);

async function shutdown(): Promise<void> {
  await Promise.allSettled([...workers.map((w) => w.close()), pool.close()]);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
