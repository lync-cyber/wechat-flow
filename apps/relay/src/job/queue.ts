import { Queue } from "bullmq";
import type { JobKind } from "./types.ts";

export interface QueueConnection {
  host: string;
  port: number;
}

export function createQueue(kind: JobKind, connection: QueueConnection): Queue {
  return new Queue(`bullmq-${kind}`, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    },
  });
}
