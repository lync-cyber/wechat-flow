import { serve } from "@hono/node-server";
import { Redis } from "ioredis";
import { loadImageHostConfig } from "./credentials/store.ts";
import { createAdapterFromConfig } from "./image-host/factory.ts";
import { createApp } from "./index.ts";
import { createJobsRuntime } from "./job/runtime.ts";

const imagesAdapter = createAdapterFromConfig(loadImageHostConfig(process.env));

const redisUrl = new URL(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
const connection = { host: redisUrl.hostname, port: Number(redisUrl.port || 6379) };
const redis = new Redis({ ...connection, maxRetriesPerRequest: null });
const { jobsDeps } = createJobsRuntime({ redis, connection });

const app = createApp({ imagesAdapter, jobsDeps });

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`relay listening on http://localhost:${info.port}`);
});
