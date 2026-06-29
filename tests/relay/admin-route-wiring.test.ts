/**
 * T-125 AC-001..007, AC-009 — admin route wiring tests.
 * Verifies that createApp() exposes /api/v1/admin/api-keys after wiring
 * createAdminApiKeysApp into createApp.
 */
import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createAdminApiKeysApp } from "../../apps/relay/src/admin/api-keys.ts";
import type { ApiKeyEntry } from "../../apps/relay/src/admin/api-keys.ts";
import { createAdminGuard } from "../../apps/relay/src/auth/admin-guard.ts";
import { createApp } from "../../apps/relay/src/index.ts";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Builds a guard with allowAllIps:true (avoids loopback-only block in test env)
 * and an optional lookupAdminKey resolver.
 */
function makeGuard(auditLog = vi.fn(), lookupAdminKey?: (h: string) => string | null) {
  return createAdminGuard({ auditLog, allowAllIps: true, lookupAdminKey });
}

/**
 * Shared in-memory store and admin key setup used across tests that need a
 * consistent key to authenticate with.
 */
function makeAdminKeyStore() {
  const store = new Map<
    string,
    { id: string; label: string; apiKeyHash: string; scope: string; createdAt: string }
  >();
  return store;
}

/**
 * Builds a createApp instance with admin wiring using the provided guard + store.
 */
function makeWiredApp(
  auditLog = vi.fn(),
  lookupAdminKey?: (h: string) => string | null,
  store?: Map<
    string,
    { id: string; label: string; apiKeyHash: string; scope: string; createdAt: string }
  >
) {
  const guard = makeGuard(auditLog, lookupAdminKey);
  const adminApiKeysApp = createAdminApiKeysApp({ guard, store });
  // T-125 wiring: createApp must accept adminDeps and route to adminApiKeysApp.
  return createApp({ adminDeps: { app: adminApiKeysApp } });
}

const ADMIN_HEADERS = {
  "content-type": "application/json",
  "x-admin-request": "1",
} as const;

// ---------------------------------------------------------------------------
// AC-009 (explicit non-501 assertion — prerequisite check)
// ---------------------------------------------------------------------------

describe("T-125 AC-009: /api/v1/admin/api-keys is no longer a 501 stub after wiring", () => {
  it("POST /api/v1/admin/api-keys does NOT return 501 when adminDeps are wired", async () => {
    const app = makeWiredApp();
    const res = await app.request("/api/v1/admin/api-keys", {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ label: "sentinel" }),
    });
    expect(res.status).not.toBe(501);
  });

  it("GET /api/v1/admin/api-keys does NOT return 501 when adminDeps are wired", async () => {
    const app = makeWiredApp();
    const res = await app.request("/api/v1/admin/api-keys", {
      method: "GET",
      headers: { "x-admin-request": "1" },
    });
    expect(res.status).not.toBe(501);
  });
});

// ---------------------------------------------------------------------------
// AC-001: POST creates key — 201 with apiKey plaintext; GET list omits plaintext
// ---------------------------------------------------------------------------

describe("T-125 AC-001: POST /api/v1/admin/api-keys creates key; GET list omits plaintext", () => {
  it("returns 201 with apiKey (plaintext) and id on successful creation", async () => {
    const app = makeWiredApp();
    const res = await app.request("/api/v1/admin/api-keys", {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ label: "test-key", scope: "user" }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { apiKey: string; id: string };
    expect(body.apiKey).toMatch(/^wf_/);
    expect(typeof body.id).toBe("string");
    expect(body.id.length).toBeGreaterThan(0);
  });

  it("GET list after creation does not expose the plaintext apiKey", async () => {
    const store = makeAdminKeyStore();
    const app = makeWiredApp(vi.fn(), undefined, store);

    // Create a key
    const createRes = await app.request("/api/v1/admin/api-keys", {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ label: "secret-key" }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { apiKey: string; id: string };
    const plaintextKey = created.apiKey;

    // List keys
    const listRes = await app.request("/api/v1/admin/api-keys", {
      method: "GET",
      headers: { "x-admin-request": "1" },
    });
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as {
      keys: Array<{ id: string; label: string; apiKeyHash: string; createdAt: string }>;
    };

    expect(Array.isArray(listBody.keys)).toBe(true);
    const listText = JSON.stringify(listBody);
    // The plaintext key must NOT appear in the list response
    expect(listText).not.toContain(plaintextKey);
    // The entry must be present and contain a hash (hex), not the raw key
    const entry = listBody.keys.find((k) => k.id === created.id);
    expect(entry).toBeDefined();
    expect(entry?.apiKeyHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// AC-002: missing X-Admin-Request → 403 E_FORBIDDEN
// ---------------------------------------------------------------------------

describe("T-125 AC-002: missing X-Admin-Request header → 403 E_FORBIDDEN", () => {
  it("POST without X-Admin-Request returns 403 E_FORBIDDEN", async () => {
    const app = makeWiredApp();
    const res = await app.request("/api/v1/admin/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: "bad" }),
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_FORBIDDEN");
  });

  it("GET without X-Admin-Request returns 403 E_FORBIDDEN", async () => {
    const app = makeWiredApp();
    const res = await app.request("/api/v1/admin/api-keys", { method: "GET" });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_FORBIDDEN");
  });
});

// ---------------------------------------------------------------------------
// AC-003: invalid Bearer → 403 E_FORBIDDEN; missing Bearer → 401 E_AUTH_REQUIRED
// ---------------------------------------------------------------------------

describe("T-125 AC-003: Bearer token scope validation on wired admin route", () => {
  it("returns 401 E_AUTH_REQUIRED when no Authorization header is provided and lookupAdminKey is set", async () => {
    // lookupAdminKey always returns null (no admin key matches)
    const lookup = vi.fn().mockReturnValue(null);
    const app = makeWiredApp(vi.fn(), lookup);

    const res = await app.request("/api/v1/admin/api-keys", {
      method: "GET",
      headers: { "x-admin-request": "1" },
      // no Authorization header
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_AUTH_REQUIRED");
  });

  it("returns 403 E_FORBIDDEN when Bearer token does not match any admin key (non-admin scope)", async () => {
    // lookupAdminKey returns null — key exists but not admin scope
    const lookup = vi.fn().mockReturnValue(null);
    const app = makeWiredApp(vi.fn(), lookup);

    const res = await app.request("/api/v1/admin/api-keys", {
      method: "GET",
      headers: {
        "x-admin-request": "1",
        authorization: "Bearer wf_nonadminkey",
      },
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_FORBIDDEN");
  });

  it("allows request when lookupAdminKey returns a valid keyId", async () => {
    const lookup = vi.fn().mockReturnValue("admin-key-id-001");
    const app = makeWiredApp(vi.fn(), lookup);

    const res = await app.request("/api/v1/admin/api-keys", {
      method: "GET",
      headers: {
        "x-admin-request": "1",
        authorization: "Bearer wf_validadminkey",
      },
    });

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// AC-004: non-allowlisted IP → 403 E_FORBIDDEN
// ---------------------------------------------------------------------------

describe("T-125 AC-004: non-allowlisted IP → 403 E_FORBIDDEN", () => {
  it("returns 403 E_FORBIDDEN when IP is not in the admin allowlist", async () => {
    // Create guard with specific IP allowlist that excludes "unknown" (test env IP)
    // In test env, resolveClientIp returns "unknown" (no real socket).
    // Allowlist set to ["192.168.1.1"] — test env IP "unknown" is not in it.
    const guard = createAdminGuard({
      auditLog: vi.fn(),
      allowedIps: ["192.168.1.1"],
      allowAllIps: false,
    });
    const adminApiKeysApp = createAdminApiKeysApp({ guard });
    const app = createApp({ adminDeps: { app: adminApiKeysApp } } as Parameters<
      typeof createApp
    >[0]);

    const res = await app.request("/api/v1/admin/api-keys", {
      method: "GET",
      headers: { "x-admin-request": "1" },
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_FORBIDDEN");
  });
});

// ---------------------------------------------------------------------------
// AC-005: GET list returns expected shape (no plaintext key field)
// ---------------------------------------------------------------------------

describe("T-125 AC-005: GET /api/v1/admin/api-keys returns correct list shape", () => {
  it("returns 200 with keys array; entries contain id/label/apiKeyHash/scope/createdAt but not raw key", async () => {
    const store = makeAdminKeyStore();
    const app = makeWiredApp(vi.fn(), undefined, store);

    // Seed a key via POST
    const createRes = await app.request("/api/v1/admin/api-keys", {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ label: "listed-key", scope: "user" }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { apiKey: string; id: string };

    const res = await app.request("/api/v1/admin/api-keys", {
      method: "GET",
      headers: { "x-admin-request": "1" },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      keys: Array<{
        id: string;
        label: string;
        apiKeyHash: string;
        scope: string;
        createdAt: string;
      }>;
    };

    expect(Array.isArray(body.keys)).toBe(true);
    const entry = body.keys.find((k) => k.id === created.id);
    expect(entry).toBeDefined();
    // Must have these fields
    expect(typeof entry?.label).toBe("string");
    expect(entry?.label).toBe("listed-key");
    expect(entry?.scope).toBe("user");
    expect(typeof entry?.createdAt).toBe("string");
    expect(Number.isNaN(Date.parse(entry?.createdAt ?? ""))).toBe(false);
    // Must NOT expose plaintext key
    expect(JSON.stringify(body)).not.toContain(created.apiKey);
  });
});

// ---------------------------------------------------------------------------
// AC-006: PATCH rotate returns newKey + graceUntil
// ---------------------------------------------------------------------------

describe("T-125 AC-006: PATCH /api/v1/admin/api-keys/:id/rotate returns new key", () => {
  it("returns 200 with new apiKey (wf_ prefix) different from original", async () => {
    const store = makeAdminKeyStore();
    const app = makeWiredApp(vi.fn(), undefined, store);

    // Create a key
    const createRes = await app.request("/api/v1/admin/api-keys", {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ label: "rotate-me" }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { apiKey: string; id: string };

    // Rotate the key (actual route: PATCH /admin/api-keys/:id)
    const rotateRes = await app.request(`/api/v1/admin/api-keys/${created.id}`, {
      method: "PATCH",
      headers: { "x-admin-request": "1" },
    });

    expect(rotateRes.status).toBe(200);
    const rotated = (await rotateRes.json()) as { apiKey: string; id: string };
    expect(rotated.apiKey).toMatch(/^wf_/);
    expect(rotated.apiKey).not.toBe(created.apiKey);
    expect(rotated.id).toBe(created.id);
  });

  it("returns 404 with JSON error envelope E_NOT_FOUND when rotating a non-existent keyId", async () => {
    // First create a key so the route is properly wired (fails with 404 on POST pre-wiring).
    // This forces the FAIL to come from the POST 201 assertion (same as other tests),
    // not from a JSON parse crash on Hono's plain-text 404 default.
    const store = makeAdminKeyStore();
    const app = makeWiredApp(vi.fn(), undefined, store);

    // Seed any key so the admin route is exercised at all
    const createRes = await app.request("/api/v1/admin/api-keys", {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ label: "rotate-seed" }),
    });
    expect(createRes.status).toBe(201);

    // Rotate a completely different, non-existent id
    const rotateRes = await app.request("/api/v1/admin/api-keys/does-not-exist-id", {
      method: "PATCH",
      headers: { "x-admin-request": "1" },
    });

    expect(rotateRes.status).toBe(404);
    const body = (await rotateRes.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// AC-007: DELETE revokes key; re-delete returns 404 (key already gone)
// ---------------------------------------------------------------------------

describe("T-125 AC-007: DELETE /api/v1/admin/api-keys/:id revokes key", () => {
  it("returns 200 with revoked:true on first delete; 404 E_NOT_FOUND on second delete", async () => {
    const store = makeAdminKeyStore();
    const app = makeWiredApp(vi.fn(), undefined, store);

    // Create a key to delete
    const createRes = await app.request("/api/v1/admin/api-keys", {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ label: "to-revoke" }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { apiKey: string; id: string };

    // First DELETE
    const delRes = await app.request(`/api/v1/admin/api-keys/${created.id}`, {
      method: "DELETE",
      headers: { "x-admin-request": "1" },
    });
    expect(delRes.status).toBe(200);
    const delBody = (await delRes.json()) as { revoked: boolean; id: string };
    expect(delBody.revoked).toBe(true);
    expect(delBody.id).toBe(created.id);

    // Second DELETE — key no longer exists → 404
    const del2Res = await app.request(`/api/v1/admin/api-keys/${created.id}`, {
      method: "DELETE",
      headers: { "x-admin-request": "1" },
    });
    expect(del2Res.status).toBe(404);
    const del2Body = (await del2Res.json()) as { error: { code: string } };
    expect(del2Body.error.code).toBe("E_NOT_FOUND");
  });

  it("key no longer appears in GET list after deletion", async () => {
    const store = makeAdminKeyStore();
    const app = makeWiredApp(vi.fn(), undefined, store);

    const createRes = await app.request("/api/v1/admin/api-keys", {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ label: "ephemeral" }),
    });
    const created = (await createRes.json()) as { apiKey: string; id: string };

    await app.request(`/api/v1/admin/api-keys/${created.id}`, {
      method: "DELETE",
      headers: { "x-admin-request": "1" },
    });

    const listRes = await app.request("/api/v1/admin/api-keys", {
      method: "GET",
      headers: { "x-admin-request": "1" },
    });
    const listBody = (await listRes.json()) as { keys: Array<{ id: string }> };
    expect(listBody.keys.find((k) => k.id === created.id)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// R-001: main.ts production wiring — lookupAdminKey connected; Layer 1 enforced
// ---------------------------------------------------------------------------

/** Replicates the main.ts shared-store + lookupAdminKey wiring pattern. */
function makeProductionWiredApp() {
  const store = new Map<string, ApiKeyEntry>();

  function hashKey(raw: string): string {
    return createHmac("sha256", process.env.API_KEY_PEPPER ?? "")
      .update(raw)
      .digest("hex");
  }

  function lookupAdminKey(hash: string): string | null {
    for (const entry of store.values()) {
      if (entry.apiKeyHash === hash && entry.scope === "admin") {
        return entry.id;
      }
    }
    return null;
  }

  const guard = createAdminGuard({
    auditLog: vi.fn(),
    allowAllIps: true,
    lookupAdminKey,
  });
  const adminApp = createAdminApiKeysApp({ guard, store });
  const app = createApp({ adminDeps: { app: adminApp } });
  return { app, store, hashKey };
}

describe("R-001: main.ts production wiring — lookupAdminKey enforces Layer 1 Bearer auth", () => {
  it("returns 401 E_AUTH_REQUIRED when no Authorization header is present", async () => {
    const { app } = makeProductionWiredApp();

    const res = await app.request("/api/v1/admin/api-keys", {
      method: "GET",
      headers: { "x-admin-request": "1" },
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_AUTH_REQUIRED");
  });

  it("returns 403 E_FORBIDDEN when Bearer token does not match any admin key in the shared store", async () => {
    const { app } = makeProductionWiredApp();

    const res = await app.request("/api/v1/admin/api-keys", {
      method: "GET",
      headers: {
        "x-admin-request": "1",
        authorization: "Bearer wf_invalid_key_not_in_store",
      },
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_FORBIDDEN");
  });

  it("fails-closed (403) when store is empty — no admin key has been provisioned", async () => {
    const { app } = makeProductionWiredApp();

    const res = await app.request("/api/v1/admin/api-keys", {
      method: "POST",
      headers: {
        "x-admin-request": "1",
        "content-type": "application/json",
        authorization: "Bearer wf_any_key_store_is_empty",
      },
      body: JSON.stringify({ label: "bootstrap-attempt" }),
    });

    expect(res.status).toBe(403);
  });

  it("allows request when a valid admin-scoped Bearer token is present in the shared store", async () => {
    const { app, store, hashKey } = makeProductionWiredApp();

    // Seed an admin key directly into the shared store (simulating a pre-provisioned key)
    const rawKey = "wf_test_admin_seed_key";
    const id = "admin-seed-id-001";
    store.set(id, {
      id,
      label: "seeded-admin",
      apiKeyHash: hashKey(rawKey),
      scope: "admin",
      createdAt: new Date().toISOString(),
    });

    const res = await app.request("/api/v1/admin/api-keys", {
      method: "GET",
      headers: {
        "x-admin-request": "1",
        authorization: `Bearer ${rawKey}`,
      },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { keys: Array<{ id: string }> };
    expect(body.keys.some((k) => k.id === id)).toBe(true);
  });
});
