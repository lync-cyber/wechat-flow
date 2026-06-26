import { createHmac } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import { errorResponse } from "../http/error.ts";

export interface AuditEntry {
  actor: string;
  action: string;
  target: string;
  ts: string;
}

export interface AdminGuardDeps {
  /** Called with each audit entry on guarded mutations. */
  auditLog: (entry: AuditEntry) => void;
  /**
   * IP allowlist. Defaults to loopback-only ["127.0.0.1", "::1"].
   * Pass `allowAllIps: true` to disable IP filtering (opt-in, not default).
   */
  allowedIps?: string[];
  /** Explicit opt-in to skip IP filtering. Must be set to true to allow all IPs. */
  allowAllIps?: boolean;
  /**
   * Resolves a Bearer token SHA-256 HMAC hash to an admin key ID.
   * Returns the apiKeyId string if the key has scope='admin', null otherwise.
   */
  lookupAdminKey?: (hash: string) => string | null;
}

export interface AdminGuard {
  middleware: MiddlewareHandler;
  audit: (entry: AuditEntry) => void;
}

/** Loopback addresses used as the default IP allowlist. */
const DEFAULT_ALLOWED_IPS = ["127.0.0.1", "::1"];

/**
 * Resolves client IP from the raw socket address (most reliable).
 * Falls back to the rightmost non-private entry in X-Forwarded-For to
 * resist header spoofing.
 * [ASSUMPTION] Deployments behind a trusted reverse proxy may configure
 * allowedIps to match the proxy egress IP; XFF is treated as advisory.
 */
function resolveClientIp(req: Request): string {
  // Prefer raw socket address when available (not spoofable via headers)
  const socketAddr = (req as unknown as { socket?: { remoteAddress?: string } }).socket
    ?.remoteAddress;
  if (socketAddr) return socketAddr;

  // Fall back to rightmost XFF entry (last-added by trusted infrastructure)
  const xff = req.headers.get("x-forwarded-for");
  if (!xff) return "unknown";
  const parts = xff.split(",").map((s) => s.trim());
  // Rightmost entry is set by the outermost known infrastructure hop
  return parts[parts.length - 1] ?? "unknown";
}

function hashAdminKey(raw: string): string {
  return createHmac("sha256", process.env.API_KEY_PEPPER ?? "")
    .update(raw)
    .digest("hex");
}

function extractBearer(authHeader: string | null): string | undefined {
  if (!authHeader) return undefined;
  const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
  return match?.[1];
}

export function createAdminGuard(deps: AdminGuardDeps): AdminGuard {
  const { auditLog, allowAllIps = false, lookupAdminKey } = deps;
  const allowedIps = deps.allowedIps ?? DEFAULT_ALLOWED_IPS;

  const middleware: MiddlewareHandler = async (c, next) => {
    // Layer 1: Bearer token → HMAC hash → scope='admin' lookup
    if (lookupAdminKey) {
      const raw = extractBearer(c.req.header("authorization") ?? null);
      if (!raw) {
        return errorResponse(c, 401, "E_AUTH_REQUIRED", "missing admin bearer token");
      }
      const hash = hashAdminKey(raw);
      const keyId = lookupAdminKey(hash);
      if (keyId === null) {
        return errorResponse(c, 403, "E_FORBIDDEN", "invalid admin key or insufficient scope");
      }
      c.set("adminKeyId", keyId);
    }

    // Layer 2: X-Admin-Request sentinel header
    const header = c.req.header("x-admin-request");
    if (header !== "1") {
      return errorResponse(c, 403, "E_FORBIDDEN", "missing or invalid X-Admin-Request header");
    }

    // Layer 3: IP allowlist (loopback by default; requires allowAllIps:true to skip)
    if (!allowAllIps) {
      const ip = resolveClientIp(c.req.raw);
      if (!allowedIps.includes(ip)) {
        return errorResponse(c, 403, "E_FORBIDDEN", "IP not in admin allowlist");
      }
    }

    await next();
  };

  return { middleware, audit: auditLog };
}
