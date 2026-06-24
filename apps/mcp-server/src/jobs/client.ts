export interface JobsClient {
  enqueue(
    kind: string,
    payload: unknown,
    opts?: { idempotencyKey?: string }
  ): Promise<{ jobId: string }>;
  getJob(jobId: string): Promise<{
    status: "pending" | "running" | "succeeded" | "failed";
    result?: { url: string };
    error?: string;
  }>;
}

export function makeNotImplementedJobsClient(): JobsClient {
  return {
    async enqueue() {
      return { jobId: "not-implemented" };
    },
    async getJob() {
      return { status: "failed", error: "E_NOT_IMPLEMENTED" };
    },
  };
}
