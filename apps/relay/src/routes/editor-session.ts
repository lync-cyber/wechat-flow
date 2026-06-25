import { Hono } from "hono";
import { z } from "zod";
import type { EditorSessionDeps } from "../auth/editor-session.ts";
import {
  EditorAuthError,
  issueEditorSession,
  refreshEditorSession,
} from "../auth/editor-session.ts";
import { errorResponse } from "../http/error.ts";

const issueBodySchema = z.discriminatedUnion("bootstrap", [
  z.object({
    bootstrap: z.literal("oauth"),
    provider: z.enum(["github", "wechat-mp", "custom"]),
    oauthToken: z.string().min(1),
  }),
  z.object({
    bootstrap: z.literal("anonymous"),
    deviceFingerprint: z.string().min(16).max(128),
    captchaToken: z.string().optional(),
  }),
]);

function extractBearer(authHeader: string | undefined): string | undefined {
  if (!authHeader) return undefined;
  const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
  return match ? match[1] : undefined;
}

/**
 * Creates the Hono sub-application for editor session endpoints.
 */
export function createEditorSessionApp(deps: EditorSessionDeps): Hono {
  const app = new Hono();

  app.post("/api/v1/editor/session", async (c) => {
    const origin = c.req.header("x-editor-origin");
    if (!origin || !deps.allowedOrigins.includes(origin)) {
      return errorResponse(c, 403, "E_PERMISSION_DENIED", "origin is not allowlisted");
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return errorResponse(c, 400, "E_INVALID_JSON", "request body is not valid JSON");
    }

    const parsed = issueBodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(c, 400, "E_VALIDATION", "request body failed schema validation");
    }

    const input = parsed.data;

    const forwarded = c.req.header("x-forwarded-for") ?? "unknown";
    const clientIp = forwarded.split(",")[0].trim();
    const { allowed } = deps.rateLimiter.check(clientIp, deps.clock());
    if (!allowed) {
      return errorResponse(c, 429, "E_QUOTA_EXCEEDED", "too many session requests");
    }

    try {
      const result = await issueEditorSession(input, deps);
      return c.json(result, 200);
    } catch (e) {
      if (e instanceof EditorAuthError) {
        return errorResponse(c, 401, "E_AUTH", "authentication failed");
      }
      throw e;
    }
  });

  app.post("/api/v1/editor/session/refresh", async (c) => {
    const token = extractBearer(c.req.header("authorization"));
    if (!token) {
      return errorResponse(c, 401, "E_UNAUTHORIZED", "missing bearer token");
    }

    try {
      const result = await refreshEditorSession(token, deps);
      return c.json(result, 200);
    } catch {
      return errorResponse(c, 401, "E_UNAUTHORIZED", "session refresh rejected");
    }
  });

  return app;
}
