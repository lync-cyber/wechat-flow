import { Hono } from "hono";
import { registerBuiltins } from "../bootstrap.ts";
import type { JobsClient } from "../jobs/client.ts";
import { makeNotImplementedJobsClient } from "../jobs/client.ts";
import { dispatchTool } from "../tools/router.ts";

export interface TokenResolver {
  /** Returns the resolved scope (e.g. "user") or null when token is absent/invalid. */
  resolve(token: string | undefined): Promise<"user" | "admin" | null>;
}

export interface HttpTransportDeps {
  jobsClient?: JobsClient;
  /**
   * Resolves Bearer token to a scope string.
   * // cataforge: wiring-placeholder — default resolver passes through with scope "user"
   * pending E-010 API-key DB wiring (backlog: T-051 / SR-R2 transport-auth).
   * Replace with a real key-lookup before exposing publicly.
   */
  tokenResolver?: TokenResolver;
}

function resolveRequestId(req: Request): string {
  return req.headers.get("x-request-id") ?? crypto.randomUUID();
}

function errorJson(
  c: { json: (body: unknown, status: number) => Response },
  status: number,
  code: string,
  message: string,
  requestId: string
): Response {
  return c.json({ error: { code, message, requestId } }, status);
}

function extractBearer(req: Request): string | undefined {
  const auth = req.headers.get("authorization");
  if (!auth) return undefined;
  const match = /^Bearer\s+(\S+)$/i.exec(auth);
  return match?.[1];
}

// cataforge: wiring-placeholder — passthrough resolver; replace with E-010 lookup.
const passthroughResolver: TokenResolver = {
  resolve: async (_token) => "user",
};

/**
 * Creates a standalone Hono app exposing MCP tool dispatch over HTTP.
 * POST /mcp/tools/:tool — dispatches to the named tool.
 * Token resolution is injectable via deps.tokenResolver.
 */
export function createHttpTransportApp(deps: HttpTransportDeps = {}): Hono {
  registerBuiltins();
  const jobsClient = deps.jobsClient ?? makeNotImplementedJobsClient();
  const tokenResolver = deps.tokenResolver ?? passthroughResolver;
  const app = new Hono();

  app.post("/mcp/tools/:tool", async (c) => {
    const requestId = resolveRequestId(c.req.raw);
    const toolName = c.req.param("tool");

    const token = extractBearer(c.req.raw);
    const scope = await tokenResolver.resolve(token);
    if (scope === null) {
      return errorJson(c, 401, "E_AUTH_REQUIRED", "missing or invalid bearer token", requestId);
    }
    if (scope !== "user") {
      return errorJson(c, 403, "E_FORBIDDEN", "admin scope cannot call user tools", requestId);
    }

    let args: Record<string, unknown>;
    try {
      const raw = await c.req.text();
      args = raw.length > 0 ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } catch {
      return errorJson(c, 400, "E_INVALID_JSON", "request body is not valid JSON", requestId);
    }

    const result = await dispatchTool(toolName, args, { scope }, jobsClient);

    if (
      result &&
      typeof result === "object" &&
      "code" in result &&
      result.code === "E_NOT_IMPLEMENTED"
    ) {
      return errorJson(c, 404, "E_NOT_FOUND", `tool not found: ${toolName}`, requestId);
    }

    return c.json(result, 200);
  });

  return app;
}
