import type { MiddlewareHandler } from "hono";
import type { TokenResolverDeps } from "../auth/token-resolver.ts";
import { resolveBearer } from "../auth/token-resolver.ts";
import { errorResponse } from "../http/error.ts";

export interface AuthInfo {
  sub?: string;
  scope: string[];
  sessionId?: string;
}

export type AuthVariables = { auth: AuthInfo };

export type AuthMiddlewareDeps = TokenResolverDeps;

function extractBearer(authHeader: string | undefined): string | undefined {
  if (!authHeader) return undefined;
  const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
  return match ? match[1] : undefined;
}

export function createAuthMiddleware(
  deps: AuthMiddlewareDeps,
  opts: { requireScope?: string } = {}
): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c, next) => {
    const token = extractBearer(c.req.header("authorization"));
    if (!token) {
      return errorResponse(c, 401, "E_UNAUTHORIZED", "missing bearer token");
    }

    const resolved = await resolveBearer(token, deps);
    if (!resolved.valid || resolved.iss !== "editor") {
      return errorResponse(c, 401, "E_UNAUTHORIZED", "invalid or expired session token");
    }

    const scope = (resolved.scope ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (opts.requireScope && !scope.includes(opts.requireScope)) {
      return errorResponse(c, 403, "E_FORBIDDEN", `missing required scope: ${opts.requireScope}`);
    }

    c.set("auth", { sub: resolved.sub, scope, sessionId: resolved.sessionId });
    await next();
  };
}
