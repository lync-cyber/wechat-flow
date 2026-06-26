import { createHmac, randomBytes } from "node:crypto";
import { Hono } from "hono";
import type { AdminGuard } from "../auth/admin-guard.ts";
import { errorResponse } from "../http/error.ts";

export interface ApiKeyEntry {
  id: string;
  label: string;
  apiKeyHash: string;
  scope: string;
  createdAt: string;
}

export interface AdminApiKeysDeps {
  guard: AdminGuard;
  /**
   * Injected key store. Defaults to a new in-memory Map per app instance.
   * // cataforge: wiring-placeholder — replace with E-010 DB persistence before production use.
   */
  store?: Map<string, ApiKeyEntry>;
}

function generateApiKey(): string {
  return `wf_${randomBytes(24).toString("hex")}`;
}

/** HMAC-SHA256 with an application-level PEPPER to resist rainbow-table attacks. */
function hashKey(raw: string): string {
  return createHmac("sha256", process.env.API_KEY_PEPPER ?? "")
    .update(raw)
    .digest("hex");
}

/** Retrieves the caller's admin key ID set by admin-guard middleware, or falls back to hash prefix. */
function resolveActor(c: { get: (key: string) => unknown }, keyHash: string): string {
  const id = c.get("adminKeyId");
  return typeof id === "string" && id.length > 0 ? id : keyHash.slice(0, 8);
}

export function createAdminApiKeysApp(deps: AdminApiKeysDeps): Hono {
  // cataforge: wiring-placeholder — store defaults to in-memory Map; wire E-010 DB before production.
  const { guard, store = new Map<string, ApiKeyEntry>() } = deps;
  const app = new Hono();

  app.use("/admin/api-keys", guard.middleware);
  app.use("/admin/api-keys/*", guard.middleware);

  /** POST /admin/api-keys — create a new API key (API-028) */
  app.post("/admin/api-keys", async (c) => {
    let body: { label?: string; scope?: string };
    try {
      body = await c.req.json();
    } catch {
      return errorResponse(c, 400, "E_INVALID_JSON", "request body is not valid JSON");
    }

    const label = typeof body.label === "string" ? body.label : "";
    const scope = typeof body.scope === "string" ? body.scope : "user";
    const raw = generateApiKey();
    const id = crypto.randomUUID();
    const apiKeyHash = hashKey(raw);
    const entry: ApiKeyEntry = {
      id,
      label,
      apiKeyHash,
      scope,
      createdAt: new Date().toISOString(),
    };
    store.set(id, entry);

    guard.audit({
      actor: resolveActor(c, apiKeyHash),
      action: "create-api-key",
      target: id,
      ts: entry.createdAt,
    });

    return c.json({ apiKey: raw, id }, 201);
  });

  /** GET /admin/api-keys — list all keys without plaintext (API-029) */
  app.get("/admin/api-keys", (c) => {
    const keys = Array.from(store.values()).map((entry) => ({
      id: entry.id,
      label: entry.label,
      apiKeyHash: entry.apiKeyHash,
      scope: entry.scope,
      createdAt: entry.createdAt,
    }));
    return c.json({ keys }, 200);
  });

  /** PATCH /admin/api-keys/:id — rotate key (API-030) */
  app.patch("/admin/api-keys/:id", (c) => {
    const id = c.req.param("id");
    const entry = store.get(id);
    if (!entry) {
      return errorResponse(c, 404, "E_NOT_FOUND", `api key not found: ${id}`);
    }

    const raw = generateApiKey();
    const apiKeyHash = hashKey(raw);
    const rotated: ApiKeyEntry = { ...entry, apiKeyHash };
    store.set(id, rotated);

    guard.audit({
      actor: resolveActor(c, apiKeyHash),
      action: "rotate-api-key",
      target: id,
      ts: new Date().toISOString(),
    });

    return c.json({ apiKey: raw, id }, 200);
  });

  /** DELETE /admin/api-keys/:id — revoke key (API-031) */
  app.delete("/admin/api-keys/:id", (c) => {
    const id = c.req.param("id");
    if (!store.has(id)) {
      return errorResponse(c, 404, "E_NOT_FOUND", `api key not found: ${id}`);
    }

    const entry = store.get(id) as ApiKeyEntry;
    store.delete(id);

    guard.audit({
      actor: resolveActor(c, entry.apiKeyHash),
      action: "revoke-api-key",
      target: id,
      ts: new Date().toISOString(),
    });

    return c.json({ revoked: true, id }, 200);
  });

  return app;
}
