import type { JobsClient } from "../jobs/client.ts";

export function uploadToWechatAssetTool(client: JobsClient) {
  return async (args: Record<string, unknown>) => {
    const result = await client.enqueue("wechat-asset-upload", {
      imageUrl: args.imageUrl,
      type: args.type,
    });
    if ("code" in result) return result;
    return { jobId: result.jobId };
  };
}
