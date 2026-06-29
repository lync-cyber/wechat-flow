import {
  createPlaywrightPool,
  createRenderProcessor,
  loadWechatCredentials,
  uploadWechatAsset,
} from "@wechat-flow/relay";
import { Worker } from "bullmq";
import { createWechatAssetUploadHandler } from "./handlers/wechat-asset-upload.ts";
import { WORKER_QUEUE_KINDS } from "./worker-kinds.ts";

const REDIS_URL = new URL(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
const POOL_SIZE = Number(process.env.RENDER_POOL_SIZE ?? 2);

const connection = {
  host: REDIS_URL.hostname,
  port: Number(REDIS_URL.port || 6379),
  maxRetriesPerRequest: null,
};

const pool = createPlaywrightPool({ size: POOL_SIZE });
const processor = createRenderProcessor(pool);

async function fetchAccessToken(appId: string, appSecret: string): Promise<string> {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`WeChat token endpoint HTTP ${resp.status}`);
  }
  const body = (await resp.json()) as { access_token?: string; errcode?: number; errmsg?: string };
  if (typeof body.errcode === "number" || !body.access_token) {
    throw new Error(
      `WeChat token error: ${body.errmsg ?? "missing access_token"} (${body.errcode ?? "unknown"})`
    );
  }
  return body.access_token;
}

const wechatUploadHandler = createWechatAssetUploadHandler({
  loadCredentials: async () => loadWechatCredentials(process.env),
  upload: uploadWechatAsset,
  getAccessToken: fetchAccessToken,
});

const renderKinds = WORKER_QUEUE_KINDS.filter((k) => k !== "wechat-asset-upload");
const renderQueues = renderKinds.map(
  (queueName) => new Worker(queueName, processor, { connection })
);

const wechatWorker = new Worker("wechat-asset-upload", async (job) => wechatUploadHandler(job), {
  connection,
});

const workers = [...renderQueues, wechatWorker];

async function shutdown(): Promise<void> {
  await Promise.allSettled([...workers.map((w) => w.close()), pool.close()]);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
