import { describe, expect, it, vi } from "vitest";
import { createAdminApiKeysApp } from "../../apps/relay/src/admin/api-keys.ts";
import { createAdminGuard } from "../../apps/relay/src/auth/admin-guard.ts";

/** Helper: build a guard that skips IP filtering (test environments have no loopback socket). */
function makeGuard(auditLog = vi.fn(), lookupAdminKey?: (h: string) => string | null) {
  return createAdminGuard({ auditLog, allowAllIps: true, lookupAdminKey });
}

/** Helper: build the full app with default test-friendly guard. */
function makeApp(auditLog = vi.fn()) {
  return createAdminApiKeysApp({ guard: makeGuard(auditLog) });
}

// ---------------------------------------------------------------------------
// AC-002: missing X-Admin-Request header → 403 E_FORBIDDEN
// ---------------------------------------------------------------------------

describe("T-051 AC-002: admin guard rejects requests without X-Admin-Request: 1", () => {
  it("returns 403 E_FORBIDDEN when X-Admin-Request header is absent", async () => {
    const app = makeApp();

    const res = await app.request("/admin/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: "my-key" }),
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_FORBIDDEN");
  });

  it("returns 403 E_FORBIDDEN when X-Admin-Request value is not '1'", async () => {
    const app = makeApp();

    const res = await app.request("/admin/api-keys", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-request": "true",
      },
      body: JSON.stringify({ label: "my-key" }),
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_FORBIDDEN");
  });
});

// ---------------------------------------------------------------------------
// R-001: IP allowlist defaults to loopback; allowAllIps opt-in
// ---------------------------------------------------------------------------

describe("R-001: admin guard IP allowlist defaults to loopback-only", () => {
  it("returns 403 when no IP config is set (default loopback) and request has no socket address", async () => {
    const guard = createAdminGuard({ auditLog: vi.fn() });
    const app = createAdminApiKeysApp({ guard });

    const res = await app.request("/admin/api-keys", {
      method: "GET",
      headers: { "x-admin-request": "1" },
    });

    // In the test environment there is no real socket; resolveClientIp returns "unknown"
    // which is not in DEFAULT_ALLOWED_IPS → 403
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_FORBIDDEN");
  });

  it("accepts when allowAllIps:true is set (explicit opt-in)", async () => {
    const guard = createAdminGuard({ auditLog: vi.fn(), allowAllIps: true });
    const app = createAdminApiKeysApp({ guard });

    const res = await app.request("/admin/api-keys", {
      method: "GET",
      headers: { "x-admin-request": "1" },
    });

    expect(res.status).toBe(200);
  });

  it("accepts when allowedIps includes the resolved IP", async () => {
    const guard = createAdminGuard({ auditLog: vi.fn(), allowedIps: ["unknown"] });
    const app = createAdminApiKeysApp({ guard });

    // In test env resolveClientIp returns "unknown" (no socket); explicitly whitelisting it
    const res = await app.request("/admin/api-keys", {
      method: "GET",
      headers: { "x-admin-request": "1" },
    });

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// R-002: Bearer token scope validation
// ---------------------------------------------------------------------------

describe("R-002: admin guard Bearer token scope validation", () => {
  it("returns 401 E_AUTH_REQUIRED when Authorization header is missing and lookupAdminKey is set", async () => {
    const lookup = vi.fn().mockReturnValue(null);
    const guard = createAdminGuard({
      auditLog: vi.fn(),
      allowAllIps: true,
      lookupAdminKey: lookup,
    });
    const app = createAdminApiKeysApp({ guard });

    const res = await app.request("/admin/api-keys", {
      method: "GET",
      headers: { "x-admin-request": "1" },
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_AUTH_REQUIRED");
  });

  it("returns 403 E_FORBIDDEN when Bearer token does not match any admin key", async () => {
    const lookup = vi.fn().mockReturnValue(null);
    const guard = createAdminGuard({
      auditLog: vi.fn(),
      allowAllIps: true,
      lookupAdminKey: lookup,
    });
    const app = createAdminApiKeysApp({ guard });

    const res = await app.request("/admin/api-keys", {
      method: "GET",
      headers: { "x-admin-request": "1", authorization: "Bearer wf_invalid" },
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_FORBIDDEN");
  });

  it("passes through when lookupAdminKey returns a valid keyId", async () => {
    const lookup = vi.fn().mockReturnValue("key-id-123");
    const guard = createAdminGuard({
      auditLog: vi.fn(),
      allowAllIps: true,
      lookupAdminKey: lookup,
    });
    const app = createAdminApiKeysApp({ guard });

    const res = await app.request("/admin/api-keys", {
      method: "GET",
      headers: { "x-admin-request": "1", authorization: "Bearer wf_someadminkey" },
    });

    expect(res.status).toBe(200);
    expect(lookup).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AC-003: audit log records { actor, action, target, ts } on create
// ---------------------------------------------------------------------------

describe("T-051 AC-003: audit log records create-api-key event", () => {
  it("records { actor, action: 'create-api-key', target, ts } when key is created", async () => {
    const auditLog = vi.fn();
    const app = makeApp(auditLog);

    const res = await app.request("/admin/api-keys", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-request": "1",
      },
      body: JSON.stringify({ label: "test-key" }),
    });

    expect(res.status).toBe(201);
    expect(auditLog).toHaveBeenCalledOnce();
    const logEntry = auditLog.mock.calls[0][0] as {
      actor: string;
      action: string;
      target: string;
      ts: string;
    };
    expect(logEntry.action).toBe("create-api-key");
    expect(typeof logEntry.actor).toBe("string");
    expect(typeof logEntry.target).toBe("string");
    expect(typeof logEntry.ts).toBe("string");
    // ts must be a valid ISO date string
    expect(Number.isNaN(Date.parse(logEntry.ts))).toBe(false);
  });

  it("uses adminKeyId from context as actor when lookupAdminKey resolves a key", async () => {
    const auditLog = vi.fn();
    const lookup = vi.fn().mockReturnValue("admin-key-id-abc");
    const guard = createAdminGuard({ auditLog, allowAllIps: true, lookupAdminKey: lookup });
    const app = createAdminApiKeysApp({ guard });

    const res = await app.request("/admin/api-keys", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-request": "1",
        authorization: "Bearer wf_someadminkey",
      },
      body: JSON.stringify({ label: "test" }),
    });

    expect(res.status).toBe(201);
    const logEntry = auditLog.mock.calls[0][0] as { actor: string };
    // actor must be the resolved keyId, not the literal "admin"
    expect(logEntry.actor).toBe("admin-key-id-abc");
  });
});

// ---------------------------------------------------------------------------
// AC-004: create returns plaintext key (wf_xxx), list does not reveal plaintext
// ---------------------------------------------------------------------------

describe("T-051 AC-004: create returns plaintext key; list reveals only hashed form", () => {
  it("POST /admin/api-keys returns { apiKey: 'wf_...' } in plaintext", async () => {
    const app = makeApp();

    const res = await app.request("/admin/api-keys", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-request": "1",
      },
      body: JSON.stringify({ label: "my-key" }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { apiKey: string; id: string };
    expect(body.apiKey).toMatch(/^wf_/);
    expect(typeof body.id).toBe("string");
  });

  it("GET /admin/api-keys list entry does not contain plaintext apiKey", async () => {
    const app = makeApp();

    // Create a key first
    const createRes = await app.request("/admin/api-keys", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-request": "1",
      },
      body: JSON.stringify({ label: "listed-key" }),
    });
    const created = (await createRes.json()) as { apiKey: string; id: string };
    const plaintextKey = created.apiKey;

    const listRes = await app.request("/admin/api-keys", {
      method: "GET",
      headers: { "x-admin-request": "1" },
    });

    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as {
      keys: Array<{ id: string; label: string; apiKeyHash: string; createdAt: string }>;
    };

    expect(Array.isArray(listBody.keys)).toBe(true);
    const entry = listBody.keys.find((k) => k.id === created.id);
    expect(entry).toBeDefined();
    // The list must NOT contain the plaintext key
    expect(entry?.apiKeyHash).not.toBe(plaintextKey);
    // apiKeyHash should look like a hex sha-256
    expect(entry?.apiKeyHash).toMatch(/^[0-9a-f]{64}$/);
    // The response body as a string must not contain the plaintext key at all
    const listText = JSON.stringify(listBody);
    expect(listText).not.toContain(plaintextKey);
  });

  it("GET /admin/api-keys without X-Admin-Request header returns 403", async () => {
    const app = makeApp();

    const res = await app.request("/admin/api-keys", { method: "GET" });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_FORBIDDEN");
  });
});

// ---------------------------------------------------------------------------
// R-006: PATCH (rotate) and DELETE (revoke) endpoints (API-030/031)
// ---------------------------------------------------------------------------

describe("R-006: PATCH /admin/api-keys/:id — rotate key (API-030)", () => {
  it("returns a new plaintext key and updates the stored hash", async () => {
    const app = makeApp();

    const createRes = await app.request("/admin/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-request": "1" },
      body: JSON.stringify({ label: "rotate-test" }),
    });
    const { id, apiKey: originalKey } = (await createRes.json()) as { id: string; apiKey: string };

    const rotateRes = await app.request(`/admin/api-keys/${id}`, {
      method: "PATCH",
      headers: { "x-admin-request": "1" },
    });

    expect(rotateRes.status).toBe(200);
    const rotated = (await rotateRes.json()) as { apiKey: string; id: string };
    expect(rotated.id).toBe(id);
    expect(rotated.apiKey).toMatch(/^wf_/);
    expect(rotated.apiKey).not.toBe(originalKey);
  });

  it("records rotate-api-key in audit log", async () => {
    const auditLog = vi.fn();
    const app = createAdminApiKeysApp({ guard: makeGuard(auditLog) });

    const createRes = await app.request("/admin/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-request": "1" },
      body: JSON.stringify({ label: "audit-rotate" }),
    });
    const { id } = (await createRes.json()) as { id: string };

    auditLog.mockClear();
    await app.request(`/admin/api-keys/${id}`, {
      method: "PATCH",
      headers: { "x-admin-request": "1" },
    });

    expect(auditLog).toHaveBeenCalledOnce();
    const entry = auditLog.mock.calls[0][0] as { action: string; target: string };
    expect(entry.action).toBe("rotate-api-key");
    expect(entry.target).toBe(id);
  });

  it("returns 404 when key id does not exist", async () => {
    const app = makeApp();
    const res = await app.request("/admin/api-keys/nonexistent-id", {
      method: "PATCH",
      headers: { "x-admin-request": "1" },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_NOT_FOUND");
  });
});

describe("R-006: DELETE /admin/api-keys/:id — revoke key (API-031)", () => {
  it("removes the key from the store and returns revoked:true", async () => {
    const app = makeApp();

    const createRes = await app.request("/admin/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-request": "1" },
      body: JSON.stringify({ label: "revoke-test" }),
    });
    const { id } = (await createRes.json()) as { id: string };

    const delRes = await app.request(`/admin/api-keys/${id}`, {
      method: "DELETE",
      headers: { "x-admin-request": "1" },
    });

    expect(delRes.status).toBe(200);
    const body = (await delRes.json()) as { revoked: boolean; id: string };
    expect(body.revoked).toBe(true);
    expect(body.id).toBe(id);

    // Key should no longer appear in list
    const listRes = await app.request("/admin/api-keys", {
      method: "GET",
      headers: { "x-admin-request": "1" },
    });
    const listBody = (await listRes.json()) as { keys: Array<{ id: string }> };
    expect(listBody.keys.find((k) => k.id === id)).toBeUndefined();
  });

  it("records revoke-api-key in audit log", async () => {
    const auditLog = vi.fn();
    const app = createAdminApiKeysApp({ guard: makeGuard(auditLog) });

    const createRes = await app.request("/admin/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-request": "1" },
      body: JSON.stringify({ label: "audit-revoke" }),
    });
    const { id } = (await createRes.json()) as { id: string };

    auditLog.mockClear();
    await app.request(`/admin/api-keys/${id}`, {
      method: "DELETE",
      headers: { "x-admin-request": "1" },
    });

    expect(auditLog).toHaveBeenCalledOnce();
    const entry = auditLog.mock.calls[0][0] as { action: string; target: string };
    expect(entry.action).toBe("revoke-api-key");
    expect(entry.target).toBe(id);
  });

  it("returns 404 when key id does not exist", async () => {
    const app = makeApp();
    const res = await app.request("/admin/api-keys/nonexistent-id", {
      method: "DELETE",
      headers: { "x-admin-request": "1" },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_NOT_FOUND");
  });
});
