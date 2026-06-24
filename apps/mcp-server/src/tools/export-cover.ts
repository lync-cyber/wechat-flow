import type { JobsClient } from "../jobs/client.ts";

export function exportCoverTool(client: JobsClient) {
  return async (args: Record<string, unknown>) => {
    const idempotencyKey = args.idempotencyKey as string | undefined;
    const { jobId } = await client.enqueue(
      "export_cover",
      { markdown: args.markdown, themeId: args.themeId, coverStyle: args.coverStyle },
      idempotencyKey ? { idempotencyKey } : undefined
    );
    return { jobId };
  };
}
