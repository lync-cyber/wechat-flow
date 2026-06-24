import type { JobsClient } from "../jobs/client.ts";

export function getJobTool(client: JobsClient) {
  return async (args: Record<string, unknown>) => {
    const jobId = String(args.jobId ?? "");
    if (!jobId) return { code: "E_INVALID_INPUT", message: "jobId is required" };
    return client.getJob(jobId);
  };
}
