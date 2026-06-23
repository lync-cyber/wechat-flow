import { Hono } from "hono";
import { z } from "zod";
import type { EditorSessionDeps } from "../auth/editor-session.ts";
import {
  EditorAuthError,
  issueEditorSession,
  refreshEditorSession,
} from "../auth/editor-session.ts";
import { resolveBearer } from "../auth/token-resolver.ts";

const issueBodySchema = z.discriminatedUnion("bootstrap", [
  z.object({
    bootstrap: z.literal("oauth"),
    provider: z.enum(["github", "wechat-mp", "custom"]),
    oauthToken: z.string().min(1),
  }),
  z.object({
    bootstrap: z.literal("anonymous"),
    deviceFingerprint: z.string().min(1),
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
      return c.json({ error: "E_PERMISSION_DENIED" }, 403);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }

    const parsed = issueBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error", issues: parsed.error.issues }, 400);
    }

    const input = parsed.data;

    const forwarded = c.req.header("x-forwarded-for") ?? "unknown";
    const clientIp = forwarded.split(",")[0].trim();
    const { allowed } = deps.rateLimiter.check(clientIp, deps.clock());
    if (!allowed) {
      return c.json({ error: "E_QUOTA_EXCEEDED" }, 429);
    }

    try {
      const result = await issueEditorSession(input, deps);
      return c.json(result, 200);
    } catch (e) {
      if (e instanceof EditorAuthError) {
        return c.json({ error: "E_AUTH" }, 401);
      }
      throw e;
    }
  });

  app.post("/api/v1/editor/session/refresh", async (c) => {
    const token = extractBearer(c.req.header("authorization"));
    if (!token) {
      return c.json({ error: "E_UNAUTHORIZED" }, 401);
    }

    try {
      const result = await refreshEditorSession(token, deps);
      return c.json(result, 200);
    } catch {
      return c.json({ error: "E_UNAUTHORIZED" }, 401);
    }
  });

  app.post("/api/v1/images/upload", async (c) => {
    const token = extractBearer(c.req.header("authorization"));
    if (!token) {
      return c.json({ error: "E_UNAUTHORIZED" }, 401);
    }

    const resolved = await resolveBearer(token, {
      secret: deps.secret,
      sessionStore: deps.sessionStore,
      clock: deps.clock,
    });

    if (!resolved.valid || resolved.iss !== "editor") {
      return c.json({ error: "E_UNAUTHORIZED" }, 401);
    }

    const scopeParts = (resolved.scope ?? "").split(",").map((s) => s.trim());
    if (!scopeParts.includes("upload")) {
      return c.json({ error: "E_FORBIDDEN" }, 403);
    }

    return c.json({ status: "ok" }, 200);
  });

  app.post("/api/v1/admin/api-keys", async (c) => {
    const token = extractBearer(c.req.header("authorization"));
    if (!token) {
      return c.json({ error: "E_UNAUTHORIZED" }, 401);
    }

    const resolved = await resolveBearer(token, {
      secret: deps.secret,
      sessionStore: deps.sessionStore,
      clock: deps.clock,
    });

    if (!resolved.valid || resolved.iss !== "editor") {
      return c.json({ error: "E_UNAUTHORIZED" }, 401);
    }

    const scopeParts = (resolved.scope ?? "").split(",").map((s) => s.trim());
    if (!scopeParts.includes("admin")) {
      return c.json({ error: "E_FORBIDDEN" }, 403);
    }

    return c.json({ status: "ok" }, 200);
  });

  return app;
}
