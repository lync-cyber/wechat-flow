import { Hono } from "hono";
import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { type AuthVariables, createAuthMiddleware } from "../../apps/relay/src/middleware/auth.ts";

const TEST_SECRET = "test-secret-32-bytes-minimum-len!!";
const TEST_SECRET_BYTES = new TextEncoder().encode(TEST_SECRET);

function makeMemorySessionStore(revoked = false) {
  return {
    isRevoked: async () => revoked,
  };
}

async function signEditorJwt(
  opts: {
    scope?: string;
    sub?: string;
    sessionId?: string;
    expSecondsFromNow?: number;
  } = {}
): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  return new SignJWT({
    scope: opts.scope ?? "user,render,upload",
    sessionId: opts.sessionId ?? "session-001",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("editor")
    .setSubject(opts.sub ?? "user:test")
    .setIssuedAt(nowSec)
    .setExpirationTime(nowSec + (opts.expSecondsFromNow ?? 600))
    .sign(TEST_SECRET_BYTES);
}

function makeProtectedApp(opts: { requireScope?: string; revoked?: boolean } = {}) {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.use(
    "/protected",
    createAuthMiddleware(
      {
        secret: TEST_SECRET_BYTES,
        sessionStore: makeMemorySessionStore(opts.revoked),
        clock: () => Date.now(),
      },
      opts.requireScope ? { requireScope: opts.requireScope } : {}
    )
  );
  app.get("/protected", (c) => {
    const auth = c.get("auth");
    return c.json({ ok: true, sub: auth.sub, scope: auth.scope }, 200);
  });
  return app;
}

describe("createAuthMiddleware: rejects missing/invalid tokens with unified envelope", () => {
  it("returns 401 E_UNAUTHORIZED when Authorization header is absent", async () => {
    const app = makeProtectedApp();
    const res = await app.request("/protected");
    expect(res.status).toBe(401);
    const body = (await res.json()) as {
      error: { code: string; message: string; requestId: string };
    };
    expect(body.error.code).toBe("E_UNAUTHORIZED");
    expect(body.error.message).toBeTypeOf("string");
    expect(body.error.requestId).toBeTypeOf("string");
    expect(body.error.requestId.length).toBeGreaterThan(0);
  });

  it("returns 401 when the bearer token is not a valid editor JWT", async () => {
    const app = makeProtectedApp();
    const res = await app.request("/protected", {
      headers: { authorization: "Bearer not-a-real-jwt" },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_UNAUTHORIZED");
  });

  it("returns 401 when the editor session has been revoked", async () => {
    const app = makeProtectedApp({ revoked: true });
    const token = await signEditorJwt();
    const res = await app.request("/protected", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
  });
});

describe("createAuthMiddleware: scope enforcement", () => {
  it("returns 403 E_FORBIDDEN when a required scope is missing", async () => {
    const app = makeProtectedApp({ requireScope: "admin" });
    const token = await signEditorJwt({ scope: "user,render,upload" });
    const res = await app.request("/protected", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_FORBIDDEN");
  });

  it("passes the request and populates c.get('auth') when scope is satisfied", async () => {
    const app = makeProtectedApp({ requireScope: "upload" });
    const token = await signEditorJwt({ scope: "user,render,upload", sub: "user:abc" });
    const res = await app.request("/protected", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; sub: string; scope: string[] };
    expect(body.ok).toBe(true);
    expect(body.sub).toBe("user:abc");
    expect(body.scope).toContain("upload");
  });
});

describe("error envelope: requestId echoes inbound x-request-id and is mirrored to response header", () => {
  it("echoes the provided x-request-id in both the body and the response header", async () => {
    const app = makeProtectedApp();
    const res = await app.request("/protected", {
      headers: { "x-request-id": "req-trace-123" },
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("x-request-id")).toBe("req-trace-123");
    const body = (await res.json()) as { error: { requestId: string } };
    expect(body.error.requestId).toBe("req-trace-123");
  });
});
