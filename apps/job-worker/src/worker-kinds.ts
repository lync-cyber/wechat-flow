export const WORKER_QUEUE_KINDS = [
  "bullmq-long-image-render",
  "bullmq-cover-render",
  "wechat-asset-upload",
] as const;

export type WorkerQueueKind = (typeof WORKER_QUEUE_KINDS)[number];
