import type { JobsClient } from "../jobs/client.ts";

export function getJobTool(client: JobsClient) {
  return async (args: Record<string, unknown>) => client.getJob(args.jobId as string);
}
