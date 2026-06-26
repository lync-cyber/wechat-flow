import { Hono } from "hono";
import { errorResponse } from "../http/error.ts";
import type { JobKind } from "../job/types.ts";

const VALID_TYPES = new Set(["image", "voice", "video", "thumb"]);

export interface WechatAssetsAppDeps {
  enqueue: (kind: JobKind, input: unknown, apiKeyId: string) => Promise<string>;
}

export function createWechatAssetsApp(deps: WechatAssetsAppDeps): Hono {
  const { enqueue } = deps;
  const app = new Hono();

  app.post("/api/v1/wechat-assets/upload", async (c) => {
    let body: { imageUrl?: unknown; type?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return errorResponse(c, 400, "E_INVALID_JSON", "request body is not valid JSON");
    }

    const { imageUrl, type } = body;

    if (typeof imageUrl !== "string" || imageUrl.length === 0) {
      return errorResponse(c, 400, "E_INVALID_REQUEST", "imageUrl is required");
    }
    if (typeof type !== "string" || !VALID_TYPES.has(type)) {
      return errorResponse(
        c,
        400,
        "E_INVALID_REQUEST",
        "type must be one of: image, voice, video, thumb"
      );
    }

    const input = { imageUrl, type: type as "image" | "voice" | "video" | "thumb" };
    const jobId = await enqueue("wechat-asset-upload", input, "");

    return c.json({ jobId }, 200);
  });

  return app;
}
