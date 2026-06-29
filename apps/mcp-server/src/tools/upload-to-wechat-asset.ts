import {
  type WechatAssetRelayClient,
  type WechatAssetType,
  composeUploadWechatAsset,
} from "@wechat-flow/core";
import type { JobsClient } from "../jobs/client.ts";

function makeRelayClient(client: JobsClient): WechatAssetRelayClient {
  return {
    async uploadWechatAsset(input) {
      const result = await client.enqueue("wechat-asset-upload", input);
      if ("code" in result) {
        throw Object.assign(new Error(result.message ?? result.code), { code: result.code });
      }
      return { jobId: result.jobId };
    },
  };
}

export function uploadToWechatAssetTool(client: JobsClient) {
  return async (args: Record<string, unknown>) => {
    const relayClient = makeRelayClient(client);
    try {
      const result = await composeUploadWechatAsset(
        { imageUrl: String(args.imageUrl ?? ""), type: args.type as WechatAssetType },
        relayClient
      );
      return { jobId: result.jobId };
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      return { code: e.code ?? "E_UNKNOWN", message: e.message ?? "unknown error" };
    }
  };
}
