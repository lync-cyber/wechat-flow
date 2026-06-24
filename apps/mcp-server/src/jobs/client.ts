export type EnqueueResult = { jobId: string } | { code: string; message: string };

export interface JobsClient {
  enqueue(
    kind: string,
    payload: unknown,
    opts?: { idempotencyKey?: string }
  ): Promise<EnqueueResult>;
  getJob(jobId: string): Promise<{
    status: "pending" | "running" | "succeeded" | "failed";
    result?: { url: string };
    error?: string;
  }>;
}

export function makeNotImplementedJobsClient(): JobsClient {
  return {
    async enqueue() {
      return { code: "E_NOT_IMPLEMENTED", message: "jobs backend not configured" };
    },
    async getJob() {
      return { status: "failed", error: "E_NOT_IMPLEMENTED" };
    },
  };
}
