import type { JobsClient } from "../jobs/client.ts";

export function uploadImageTool(client: JobsClient) {
  return async (args: Record<string, unknown>) => {
    const idempotencyKey = args.idempotencyKey as string | undefined;
    const result = await client.enqueue(
      "upload_image",
      { url: args.url, base64: args.base64, mimeType: args.mimeType },
      idempotencyKey ? { idempotencyKey } : undefined
    );
    if ("code" in result) return result;
    return { jobId: result.jobId };
  };
}
