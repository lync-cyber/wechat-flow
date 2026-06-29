import { Hono } from "hono";
import { errorResponse } from "../http/error.ts";
import type { JobKind } from "../job/types.ts";
import type { AuthVariables } from "../middleware/auth.ts";

const VALID_TYPES = new Set(["image", "voice", "video", "thumb"]);

// Literal-IP SSRF guard covering RFC 1918, loopback, link-local, and special-use ranges.
// [ASSUMPTION] DNS rebinding (domain resolving to private IP) is not covered here; mitigation
// requires async DNS pre-resolution + second-pass filtering and is tracked as a future hardening item.
const PRIVATE_IP_RE =
  /^(?:\[::1\]|\[fe[89ab][0-9a-f]:[0-9a-f:]*\]|\[f[cd][0-9a-f]{2}:[0-9a-f:]*\]|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3}|0\.\d{1,3}\.\d{1,3}\.\d{1,3}|localhost)$/i;

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_IP_RE.test(hostname);
}

export interface WechatAssetsAppDeps {
  enqueue: (kind: JobKind, input: unknown, apiKeyId: string) => Promise<string>;
}

export function createWechatAssetsApp(
  deps: WechatAssetsAppDeps
): Hono<{ Variables: AuthVariables }> {
  const { enqueue } = deps;
  const app = new Hono<{ Variables: AuthVariables }>();

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

    // SSRF / https validation
    let parsed: URL;
    try {
      parsed = new URL(imageUrl);
    } catch {
      return errorResponse(c, 400, "E_INVALID_REQUEST", "imageUrl is not a valid URL");
    }

    if (parsed.protocol !== "https:") {
      return errorResponse(c, 400, "E_INVALID_REQUEST", "imageUrl must use https://");
    }

    if (isPrivateHost(parsed.hostname)) {
      return errorResponse(
        c,
        400,
        "E_INVALID_REQUEST",
        "imageUrl must not point to a private network address"
      );
    }

    if (typeof type !== "string" || !VALID_TYPES.has(type)) {
      return errorResponse(
        c,
        400,
        "E_INVALID_REQUEST",
        "type must be one of: image, voice, video, thumb"
      );
    }

    const apiKeyId = c.get("auth")?.sub;
    if (!apiKeyId) {
      return errorResponse(c, 401, "E_UNAUTHORIZED", "auth context missing");
    }
    const input = { imageUrl, type: type as "image" | "voice" | "video" | "thumb" };
    const jobId = await enqueue("wechat-asset-upload", input, apiKeyId);

    return c.json({ jobId, statusUrl: `/api/v1/jobs/${jobId}` }, 202);
  });

  return app;
}
