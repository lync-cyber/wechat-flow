import { SignJWT, jwtVerify } from "jose";
import { describe, expect, it } from "vitest";
import { loadEditorJwtSecret } from "../../apps/relay/src/auth/editor-session-config.ts";
import {
  type EditorSessionDeps,
  issueEditorSession,
  refreshEditorSession,
} from "../../apps/relay/src/auth/editor-session.ts";
import { resolveBearer } from "../../apps/relay/src/auth/token-resolver.ts";
import { createEditorSessionApp } from "../../apps/relay/src/routes/editor-session.ts";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TEST_SECRET = "test-secret-32-bytes-minimum-len!!";
const TEST_SECRET_BYTES = new TextEncoder().encode(TEST_SECRET);

/**
 * Minimal injectable deps used across AC-001 / AC-003 / AC-004 tests.
 * Each test block overrides only the fields it needs.
 */
function makeDefaultDeps(overrides: Partial<EditorSessionDeps> = {}): EditorSessionDeps {
  return {
    secret: TEST_SECRET_BYTES,
    clock: () => Date.now(),
    sessionStore: makeMemorySessionStore(),
    rateLimiter: makeMemoryRateLimiter(),
    verifyOAuthToken: async (provider, token) =>
      token.startsWith("invalid") ? null : { sub: `oauth:${provider}` },
    allowedOrigins: ["https://editor.example.com"],
    ...overrides,
  };
}

/** In-memory session store satisfying the SessionStore interface. */
function makeMemorySessionStore() {
  const sessions = new Map<string, { revoked: boolean }>();
  return {
    save: async (sessionId: string) => {
      sessions.set(sessionId, { revoked: false });
    },
    isRevoked: async (sessionId: string) => {
      const s = sessions.get(sessionId);
      return s === undefined || s.revoked;
    },
    revoke: async (sessionId: string) => {
      sessions.set(sessionId, { revoked: true });
    },
  };
}

/** In-memory rate limiter keyed by arbitrary string (IP). */
function makeMemoryRateLimiter(windowMs = 60_000, max = 10) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    check: (key: string, now: number): { allowed: boolean } => {
      let bucket = buckets.get(key);
      if (!bucket || now >= bucket.resetAt) {
        bucket = { count: 0, resetAt: now + windowMs };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      return { allowed: bucket.count <= max };
    },
  };
}

// ---------------------------------------------------------------------------
// AC-001: OAuth bootstrap → valid session JWT response shape
// ---------------------------------------------------------------------------

describe("AC-001: POST /api/v1/editor/session — OAuth bootstrap returns valid JWT response", () => {
  it("returns sessionJwt, expiresAt, refreshUntil, scope, sessionId", async () => {
    const deps = makeDefaultDeps();
    const result = await issueEditorSession(
      {
        bootstrap: "oauth",
        provider: "github",
        oauthToken: "gho_test_token_123",
      },
      deps
    );

    expect(result.sessionJwt).toBeTypeOf("string");
    expect(result.sessionJwt.split(".").length).toBe(3); // JWT = header.payload.signature
    expect(result.sessionId).toBeTypeOf("string");
    expect(result.sessionId.length).toBeGreaterThan(0);
    expect(result.scope).toBeTypeOf("string");
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(0);
    expect(new Date(result.refreshUntil).getTime()).toBeGreaterThan(0);
  });

  it("expiresAt is at most 15 minutes from now", async () => {
    const now = Date.now();
    const deps = makeDefaultDeps({ clock: () => now });

    const result = await issueEditorSession(
      {
        bootstrap: "oauth",
        provider: "github",
        oauthToken: "gho_test_token_123",
      },
      deps
    );

    const expiresAtMs = new Date(result.expiresAt).getTime();
    expect(expiresAtMs - now).toBeLessThanOrEqual(15 * 60 * 1000);
    expect(expiresAtMs - now).toBeGreaterThan(0);
  });

  it("scope does not contain 'admin'", async () => {
    const deps = makeDefaultDeps();
    const result = await issueEditorSession(
      {
        bootstrap: "oauth",
        provider: "github",
        oauthToken: "gho_test_token_123",
      },
      deps
    );

    const scopeParts = result.scope.split(",").map((s) => s.trim());
    expect(scopeParts).not.toContain("admin");
  });

  it("scope does not contain 'wechat-asset'", async () => {
    const deps = makeDefaultDeps();
    const result = await issueEditorSession(
      {
        bootstrap: "oauth",
        provider: "github",
        oauthToken: "gho_test_token_123",
      },
      deps
    );

    const scopeParts = result.scope.split(",").map((s) => s.trim());
    expect(scopeParts).not.toContain("wechat-asset");
  });

  it("JWT payload contains iss='editor', sub, scope, sessionId", async () => {
    const deps = makeDefaultDeps();
    const result = await issueEditorSession(
      {
        bootstrap: "oauth",
        provider: "github",
        oauthToken: "gho_test_token_123",
      },
      deps
    );

    const { payload } = await jwtVerify(result.sessionJwt, TEST_SECRET_BYTES);
    expect(payload.iss).toBe("editor");
    expect(payload.sub).toBeTypeOf("string");
    expect(payload.scope).toBeTypeOf("string");
    expect(payload.sessionId).toBeTypeOf("string");
    expect(payload.sessionId).toBe(result.sessionId);
  });

  it("anonymous bootstrap also returns valid session response", async () => {
    const deps = makeDefaultDeps();
    const result = await issueEditorSession(
      {
        bootstrap: "anonymous",
        deviceFingerprint: "fp-1234567890abcdef",
      },
      deps
    );

    expect(result.sessionJwt.split(".").length).toBe(3);
    expect(result.scope).toBeTypeOf("string");
    const scopeParts = result.scope.split(",").map((s) => s.trim());
    expect(scopeParts).not.toContain("admin");
    expect(scopeParts).not.toContain("wechat-asset");
  });

  it("HTTP endpoint POST /api/v1/editor/session returns 200 with correct body shape", async () => {
    const deps = makeDefaultDeps();
    const app = createEditorSessionApp(deps);

    const res = await app.request("/api/v1/editor/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-editor-origin": "https://editor.example.com",
      },
      body: JSON.stringify({
        bootstrap: "oauth",
        provider: "github",
        oauthToken: "gho_test_token_123",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      sessionJwt: string;
      expiresAt: string;
      refreshUntil: string;
      scope: string;
      sessionId: string;
    };
    expect(body.sessionJwt).toBeTypeOf("string");
    expect(body.expiresAt).toBeTypeOf("string");
    expect(body.refreshUntil).toBeTypeOf("string");
    expect(body.scope).toBeTypeOf("string");
    expect(body.sessionId).toBeTypeOf("string");
  });

  it("HTTP endpoint returns 400 on missing required field", async () => {
    const deps = makeDefaultDeps();
    const app = createEditorSessionApp(deps);

    const res = await app.request("/api/v1/editor/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-editor-origin": "https://editor.example.com",
      },
      body: JSON.stringify({ bootstrap: "oauth" /* missing provider+oauthToken */ }),
    });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// AC-001 (contract security paths): origin allowlist + oauth verification
// ---------------------------------------------------------------------------

describe("AC-001 security: X-Editor-Origin allowlist + oauth token verification", () => {
  it("rejects request whose X-Editor-Origin is not allowlisted with 403 E_PERMISSION_DENIED", async () => {
    const deps = makeDefaultDeps();
    const app = createEditorSessionApp(deps);

    const res = await app.request("/api/v1/editor/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-editor-origin": "https://evil.example.com",
      },
      body: JSON.stringify({
        bootstrap: "oauth",
        provider: "github",
        oauthToken: "gho_test_token_123",
      }),
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("E_PERMISSION_DENIED");
  });

  it("rejects request with missing X-Editor-Origin header with 403", async () => {
    const deps = makeDefaultDeps();
    const app = createEditorSessionApp(deps);

    const res = await app.request("/api/v1/editor/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        bootstrap: "oauth",
        provider: "github",
        oauthToken: "gho_test_token_123",
      }),
    });

    expect(res.status).toBe(403);
  });

  it("rejects oauth bootstrap with 401 E_AUTH when token verification fails", async () => {
    const deps = makeDefaultDeps();
    const app = createEditorSessionApp(deps);

    const res = await app.request("/api/v1/editor/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-editor-origin": "https://editor.example.com",
      },
      body: JSON.stringify({
        bootstrap: "oauth",
        provider: "github",
        oauthToken: "invalid-oauth-token",
      }),
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("E_AUTH");
  });

  it("issueEditorSession rejects when oauth token verification returns null", async () => {
    const deps = makeDefaultDeps();
    await expect(
      issueEditorSession(
        { bootstrap: "oauth", provider: "github", oauthToken: "invalid-direct" },
        deps
      )
    ).rejects.toThrow();
  });

  it("maps a thrown oauth verifier error to 401 E_AUTH (fail-closed)", async () => {
    const deps = makeDefaultDeps({
      verifyOAuthToken: async () => {
        throw new Error("oauth provider timeout");
      },
    });
    const app = createEditorSessionApp(deps);

    const res = await app.request("/api/v1/editor/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-editor-origin": "https://editor.example.com",
      },
      body: JSON.stringify({ bootstrap: "oauth", provider: "github", oauthToken: "any" }),
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("E_AUTH");
  });
});

// ---------------------------------------------------------------------------
// AC-002: Anonymous bootstrap rate limiting (same IP, ≥10 calls → 429)
// ---------------------------------------------------------------------------

describe("AC-002: Anonymous bootstrap rate-limiting — 11th call returns 429 E_QUOTA_EXCEEDED", () => {
  it("first 10 calls succeed, 11th returns 429 with E_QUOTA_EXCEEDED", async () => {
    const deps = makeDefaultDeps();
    const app = createEditorSessionApp(deps);

    const clientIp = "192.168.1.100";
    const requestOptions = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-editor-origin": "https://editor.example.com",
        "x-forwarded-for": clientIp,
      },
      body: JSON.stringify({
        bootstrap: "anonymous",
        deviceFingerprint: "fp-abcdef1234567890",
      }),
    };

    // First 10 calls should all succeed (2xx)
    for (let i = 0; i < 10; i++) {
      const res = await app.request("/api/v1/editor/session", {
        ...requestOptions,
        body: JSON.stringify({
          bootstrap: "anonymous",
          deviceFingerprint: "fp-abcdef1234567890",
        }),
      });
      expect(res.status).toBe(200);
    }

    // 11th call must be rejected
    const eleventhRes = await app.request("/api/v1/editor/session", {
      ...requestOptions,
      body: JSON.stringify({
        bootstrap: "anonymous",
        deviceFingerprint: "fp-abcdef1234567890",
      }),
    });

    expect(eleventhRes.status).toBe(429);
    const body = (await eleventhRes.json()) as { error: string };
    expect(body.error).toBe("E_QUOTA_EXCEEDED");
  });

  it("different IPs are tracked independently (second IP's calls are not throttled)", async () => {
    const deps = makeDefaultDeps();
    const app = createEditorSessionApp(deps);

    const ipA = "10.0.0.1";
    const ipB = "10.0.0.2";

    // Exhaust quota for ipA
    for (let i = 0; i < 11; i++) {
      await app.request("/api/v1/editor/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-editor-origin": "https://editor.example.com",
          "x-forwarded-for": ipA,
        },
        body: JSON.stringify({
          bootstrap: "anonymous",
          deviceFingerprint: "fp-aaaa1111",
        }),
      });
    }

    // ipB should still get through
    const res = await app.request("/api/v1/editor/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-editor-origin": "https://editor.example.com",
        "x-forwarded-for": ipB,
      },
      body: JSON.stringify({
        bootstrap: "anonymous",
        deviceFingerprint: "fp-bbbb2222",
      }),
    });

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// AC-003: Refresh endpoint — new JWT issued; old JWT usable in grace period
// ---------------------------------------------------------------------------

describe("AC-003: POST /api/v1/editor/session/refresh — issues new JWT; old usable in grace", () => {
  it("returns a new JWT when called within the refresh window (exp - 1min)", async () => {
    // Controlled clock: issue a token that expires in 30 seconds (well within 1-min grace window)
    const nowMs = Date.now();
    const clockValue = { current: nowMs };
    const clock = () => clockValue.current;
    const deps = makeDefaultDeps({ clock });

    // Issue initial session
    const initial = await issueEditorSession(
      { bootstrap: "oauth", provider: "github", oauthToken: "token-a" },
      deps
    );

    // Advance clock to 30 seconds before expiry (inside refresh window)
    const expiresAtMs = new Date(initial.expiresAt).getTime();
    clockValue.current = expiresAtMs - 30_000; // 30s before exp = within 1-min window

    const refreshed = await refreshEditorSession(initial.sessionJwt, deps);

    expect(refreshed.sessionJwt).toBeTypeOf("string");
    expect(refreshed.sessionJwt).not.toBe(initial.sessionJwt);
    expect(refreshed.sessionJwt.split(".").length).toBe(3);
  });

  it("new JWT has a fresh exp (≤15min from refresh time)", async () => {
    const nowMs = Date.now();
    const clockValue = { current: nowMs };
    const clock = () => clockValue.current;
    const deps = makeDefaultDeps({ clock });

    const initial = await issueEditorSession(
      { bootstrap: "oauth", provider: "github", oauthToken: "token-b" },
      deps
    );

    // Move into refresh window
    const expiresAtMs = new Date(initial.expiresAt).getTime();
    clockValue.current = expiresAtMs - 30_000;

    const refreshed = await refreshEditorSession(initial.sessionJwt, deps);
    const newExpiresAtMs = new Date(refreshed.expiresAt).getTime();

    expect(newExpiresAtMs - clockValue.current).toBeLessThanOrEqual(15 * 60 * 1000);
    expect(newExpiresAtMs).toBeGreaterThan(expiresAtMs); // new exp is later than old exp
  });

  it("old JWT remains verifiable (grace period) after refresh", async () => {
    const nowMs = Date.now();
    const clockValue = { current: nowMs };
    const clock = () => clockValue.current;
    const deps = makeDefaultDeps({ clock });

    const initial = await issueEditorSession(
      { bootstrap: "oauth", provider: "github", oauthToken: "token-c" },
      deps
    );

    const expiresAtMs = new Date(initial.expiresAt).getTime();
    clockValue.current = expiresAtMs - 30_000;

    await refreshEditorSession(initial.sessionJwt, deps);

    // Old JWT should still resolve via resolveBearer during grace period
    const resolved = await resolveBearer(initial.sessionJwt, {
      secret: TEST_SECRET_BYTES,
      sessionStore: deps.sessionStore,
      clock,
    });

    // Grace period: old session not yet revoked → resolved as valid
    expect(resolved.valid).toBe(true);
    expect(resolved.iss).toBe("editor");
  });

  it("refresh fails (returns error) when sessionId has been revoked", async () => {
    const deps = makeDefaultDeps();

    const initial = await issueEditorSession(
      { bootstrap: "oauth", provider: "github", oauthToken: "token-d" },
      deps
    );

    // Manually revoke the session
    await deps.sessionStore.revoke(initial.sessionId);

    // Attempt refresh should fail
    await expect(refreshEditorSession(initial.sessionJwt, deps)).rejects.toThrow();
  });

  it("HTTP endpoint POST /api/v1/editor/session/refresh returns 200 with new JWT", async () => {
    const nowMs = Date.now();
    const clockValue = { current: nowMs };
    const clock = () => clockValue.current;
    const deps = makeDefaultDeps({ clock });

    // Issue via core function to get the JWT
    const initial = await issueEditorSession(
      { bootstrap: "oauth", provider: "github", oauthToken: "token-http-refresh" },
      deps
    );

    // Advance into refresh window
    const expiresAtMs = new Date(initial.expiresAt).getTime();
    clockValue.current = expiresAtMs - 30_000;

    const app = createEditorSessionApp(deps);
    const res = await app.request("/api/v1/editor/session/refresh", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${initial.sessionJwt}`,
        "x-editor-origin": "https://editor.example.com",
      },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { sessionJwt: string; expiresAt: string };
    expect(body.sessionJwt).toBeTypeOf("string");
    expect(body.sessionJwt).not.toBe(initial.sessionJwt);
    expect(body.expiresAt).toBeTypeOf("string");
  });
});

// ---------------------------------------------------------------------------
// AC-004: token-resolver dispatches by iss; admin endpoint blocked with 403
// ---------------------------------------------------------------------------

describe("AC-004: token-resolver routes by iss='editor' vs long-term key; admin endpoint returns 403", () => {
  it("resolveBearer returns valid=true with iss='editor' for a well-formed editor JWT", async () => {
    const deps = makeDefaultDeps();
    const initial = await issueEditorSession(
      { bootstrap: "oauth", provider: "github", oauthToken: "token-resolve-test" },
      deps
    );

    const resolved = await resolveBearer(initial.sessionJwt, {
      secret: TEST_SECRET_BYTES,
      sessionStore: deps.sessionStore,
      clock: deps.clock,
    });

    expect(resolved.valid).toBe(true);
    expect(resolved.iss).toBe("editor");
  });

  it("resolveBearer identifies long-term API key (no iss='editor') as apiKey path", async () => {
    // A sha256-hashed long-term API key (not a JWT) should return a different resolution
    const fakeApiKey = "wf_sk_aaaabbbbccccdddd1111222233334444";
    const resolved = await resolveBearer(fakeApiKey, {
      secret: TEST_SECRET_BYTES,
      sessionStore: makeMemorySessionStore(),
      clock: () => Date.now(),
    });

    // Must not be treated as an editor session — different resolution path
    expect(resolved.iss).not.toBe("editor");
  });

  it("editor JWT calling upload endpoint (in-scope) is allowed by auth middleware", async () => {
    const deps = makeDefaultDeps();
    const initial = await issueEditorSession(
      { bootstrap: "oauth", provider: "github", oauthToken: "token-upload" },
      deps
    );

    const app = createEditorSessionApp(deps);
    const res = await app.request("/api/v1/images/upload", {
      method: "POST",
      headers: {
        authorization: `Bearer ${initial.sessionJwt}`,
        "x-editor-origin": "https://editor.example.com",
      },
    });

    // Auth middleware must pass the request (not 401 or 403); route may 404 if not mounted
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("editor JWT calling admin endpoint returns 403", async () => {
    const deps = makeDefaultDeps();
    const initial = await issueEditorSession(
      { bootstrap: "oauth", provider: "github", oauthToken: "token-admin-test" },
      deps
    );

    const app = createEditorSessionApp(deps);
    const res = await app.request("/api/v1/admin/api-keys", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${initial.sessionJwt}`,
        "x-editor-origin": "https://editor.example.com",
      },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(403);
  });

  it("resolveBearer returns valid=false for an expired editor JWT", async () => {
    // Issue a JWT with exp in the past
    const pastMs = Date.now() - 20 * 60 * 1000; // 20 min ago
    const sessionStore = makeMemorySessionStore();
    const sid = "expired-session-id";
    await sessionStore.save(sid);

    const expiredJwt = await new SignJWT({
      iss: "editor",
      sub: "user:test",
      scope: "user,render,upload",
      sessionId: sid,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(pastMs / 1000))
      .setExpirationTime(Math.floor(pastMs / 1000) + 60) // expired 19 min ago
      .sign(TEST_SECRET_BYTES);

    const resolved = await resolveBearer(expiredJwt, {
      secret: TEST_SECRET_BYTES,
      sessionStore,
      clock: () => Date.now(),
    });

    expect(resolved.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AC-005: Config guard + JWT placement constraint
// ---------------------------------------------------------------------------

describe("AC-005: loadEditorJwtSecret — throws when EDITOR_JWT_SECRET is absent", () => {
  it("throws an Error when env.EDITOR_JWT_SECRET is undefined", () => {
    expect(() => loadEditorJwtSecret({})).toThrow();
  });

  it("throws an Error when env.EDITOR_JWT_SECRET is empty string", () => {
    expect(() => loadEditorJwtSecret({ EDITOR_JWT_SECRET: "" })).toThrow();
  });

  it("returns secret bytes when env.EDITOR_JWT_SECRET is present", () => {
    const result = loadEditorJwtSecret({ EDITOR_JWT_SECRET: TEST_SECRET });
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("error message mentions EDITOR_JWT_SECRET to aid diagnosis", () => {
    let caught: Error | undefined;
    try {
      loadEditorJwtSecret({});
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).toBeDefined();
    expect(caught?.message).toContain("EDITOR_JWT_SECRET");
  });
});

describe("AC-005: JWT placement — token in Authorization header accepted; in URL query rejected", () => {
  it("resolveBearer rejects a token extracted from URL query (not Authorization header)", async () => {
    const deps = makeDefaultDeps();
    const initial = await issueEditorSession(
      { bootstrap: "oauth", provider: "github", oauthToken: "token-query-test" },
      deps
    );

    const app = createEditorSessionApp(deps);

    // Pass JWT via URL query param (forbidden placement)
    const res = await app.request(
      `/api/v1/editor/session/refresh?access_token=${initial.sessionJwt}`,
      {
        method: "POST",
        headers: {
          "x-editor-origin": "https://editor.example.com",
          // Deliberately omit Authorization header
        },
      }
    );

    // Must be rejected (401 or 400) — token in URL query is disallowed
    expect([400, 401]).toContain(res.status);
  });

  it("resolveBearer accepts a token in Authorization: Bearer header", async () => {
    const deps = makeDefaultDeps();
    const initial = await issueEditorSession(
      { bootstrap: "oauth", provider: "github", oauthToken: "token-header-test" },
      deps
    );

    const resolved = await resolveBearer(initial.sessionJwt, {
      secret: TEST_SECRET_BYTES,
      sessionStore: deps.sessionStore,
      clock: deps.clock,
    });

    expect(resolved.valid).toBe(true);
  });
});
