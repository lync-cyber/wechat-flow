import type { JobsClient } from "../jobs/client.ts";

export function exportLongImageTool(client: JobsClient) {
  return async (args: Record<string, unknown>) => {
    const idempotencyKey = args.idempotencyKey as string | undefined;
    const { jobId } = await client.enqueue(
      "export_long_image",
      { markdown: args.markdown, themeId: args.themeId },
      idempotencyKey ? { idempotencyKey } : undefined
    );
    return { jobId };
  };
}
