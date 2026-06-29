/**
 * T-126 AC-001~004 — wechat-assets route: auth gating, SSRF validation, apiKeyId injection.
 *
 * Tests verify:
 * AC-001: POST /api/v1/wechat-assets/upload via createApp (with auth wired) → 202 { jobId, statusUrl }
 * AC-002: Missing / insufficient-scope token → 401 / 403
 * AC-003: apiKeyId passed to enqueue is derived from auth context (not empty string)
 * AC-004: http:// imageUrl and private-IP imageUrl → 400, not enqueued
 */

import { SignJWT } from "jose";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../apps/relay/src/index.ts";
import type { WechatAssetsAppDeps } from "../../apps/relay/src/routes/wechat-assets.ts";
import { createWechatAssetsApp } from "../../apps/relay/src/routes/wechat-assets.ts";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const TEST_SECRET_BYTES = new TextEncoder().encode("test-secret-32-bytes-minimum-len!!");

function makeMemorySessionStore(revoked = false) {
  return {
    isRevoked: async () => revoked,
  };
}

function makeAuthDeps(store = makeMemorySessionStore()) {
  return { secret: TEST_SECRET_BYTES, sessionStore: store, clock: () => Date.now() };
}

async function signUserJwt(opts: { scope?: string; sub?: string } = {}): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  return new SignJWT({
    scope: opts.scope ?? "user",
    sessionId: "session-wechat-001",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("editor")
    .setSubject(opts.sub ?? "user:test-wechat")
    .setIssuedAt(nowSec)
    .setExpirationTime(nowSec + 600)
    .sign(TEST_SECRET_BYTES);
}

function makeEnqueue() {
  const calls: Array<{ kind: string; input: unknown; apiKeyId: string }> = [];
  const mock = vi
    .fn()
    .mockImplementation(async (kind: string, input: unknown, apiKeyId: string) => {
      calls.push({ kind, input, apiKeyId });
      return "job-uuid-wechat-001";
    });
  return { mock, calls };
}

// ---------------------------------------------------------------------------
// AC-001: POST /api/v1/wechat-assets/upload via createApp → 202 { jobId, statusUrl }
// ---------------------------------------------------------------------------

describe("AC-001: wechat-assets route mounted in createApp returns 202 with jobId and statusUrl", () => {
  it("returns 202 with jobId (uuid) and statusUrl when auth is valid and imageUrl is https", async () => {
    const token = await signUserJwt({ sub: "user:test-ac001" });
    const enqueue = makeEnqueue();

    // This test will FAIL until wechat-assets route is mounted in createApp
    // and the route returns 202 (currently wechat-assets is not mounted, and returns 200 if called directly)
    const app = createApp({
      auth: makeAuthDeps(),
      wechatAssets: { enqueue: enqueue.mock },
    } as Parameters<typeof createApp>[0]);

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ imageUrl: "https://cdn.example.com/img.png", type: "image" }),
    });

    expect(res.status).toBe(202);
    const body = (await res.json()) as { jobId: string; statusUrl: string };
    expect(body.jobId).toBe("job-uuid-wechat-001");
    expect(body.statusUrl).toMatch(/\/api\/v1\/jobs\/job-uuid-wechat-001/);
  });

  it("statusUrl includes the jobId returned by enqueue", async () => {
    const token = await signUserJwt({ sub: "user:test-statusurl" });
    const enqueue = makeEnqueue();

    const app = createApp({
      auth: makeAuthDeps(),
      wechatAssets: { enqueue: enqueue.mock },
    } as Parameters<typeof createApp>[0]);

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ imageUrl: "https://example.com/photo.jpg", type: "image" }),
    });

    expect(res.status).toBe(202);
    const body = (await res.json()) as { jobId: string; statusUrl: string };
    expect(body.statusUrl).toContain(body.jobId);
  });
});

// ---------------------------------------------------------------------------
// AC-002: auth gating — 401 for missing token, 403 for wrong scope
// ---------------------------------------------------------------------------

describe("AC-002: wechat-assets route gated by auth — 401 / 403 on bad credentials", () => {
  it("returns 401 E_UNAUTHORIZED when no Authorization header is provided", async () => {
    const enqueue = makeEnqueue();

    const app = createApp({
      auth: makeAuthDeps(),
      wechatAssets: { enqueue: enqueue.mock },
    } as Parameters<typeof createApp>[0]);

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl: "https://example.com/img.png", type: "image" }),
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_UNAUTHORIZED");
    expect(enqueue.calls).toHaveLength(0);
  });

  it("returns 403 E_FORBIDDEN when token lacks the user scope", async () => {
    const token = await signUserJwt({ scope: "render" }); // no 'user' scope
    const enqueue = makeEnqueue();

    const app = createApp({
      auth: makeAuthDeps(),
      wechatAssets: { enqueue: enqueue.mock },
    } as Parameters<typeof createApp>[0]);

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ imageUrl: "https://example.com/img.png", type: "image" }),
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_FORBIDDEN");
    expect(enqueue.calls).toHaveLength(0);
  });

  it("returns 401 when bearer token is an invalid JWT", async () => {
    const enqueue = makeEnqueue();

    const app = createApp({
      auth: makeAuthDeps(),
      wechatAssets: { enqueue: enqueue.mock },
    } as Parameters<typeof createApp>[0]);

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer not-a-jwt",
      },
      body: JSON.stringify({ imageUrl: "https://example.com/img.png", type: "image" }),
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_UNAUTHORIZED");
  });
});

// ---------------------------------------------------------------------------
// AC-003: apiKeyId injected from auth context, not empty string
// ---------------------------------------------------------------------------

describe("AC-003: enqueue receives apiKeyId from auth context (non-empty, equals token sub)", () => {
  it("enqueue is called with the authenticated user sub as apiKeyId — not an empty string", async () => {
    const expectedApiKeyId = "user:api-key-owner-xyz";
    const token = await signUserJwt({ sub: expectedApiKeyId, scope: "user" });
    const enqueue = makeEnqueue();

    const app = createApp({
      auth: makeAuthDeps(),
      wechatAssets: { enqueue: enqueue.mock },
    } as Parameters<typeof createApp>[0]);

    await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ imageUrl: "https://cdn.example.com/img.png", type: "image" }),
    });

    expect(enqueue.calls).toHaveLength(1);
    const passedApiKeyId = enqueue.calls[0]?.apiKeyId;
    expect(passedApiKeyId).toBe(expectedApiKeyId);
    expect(passedApiKeyId).not.toBe("");
  });

  it("enqueue apiKeyId is not empty string even when called without explicit sub override", async () => {
    const token = await signUserJwt({ sub: "user:implicit-sub", scope: "user" });
    const enqueue = makeEnqueue();

    const app = createApp({
      auth: makeAuthDeps(),
      wechatAssets: { enqueue: enqueue.mock },
    } as Parameters<typeof createApp>[0]);

    await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ imageUrl: "https://cdn.example.com/thumb.jpg", type: "thumb" }),
    });

    expect(enqueue.calls[0]?.apiKeyId).not.toBe("");
    expect(enqueue.calls[0]?.apiKeyId).toBeTypeOf("string");
    expect((enqueue.calls[0]?.apiKeyId ?? "").length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC-004: SSRF / https validation — http:// and private IPs rejected with 400
// ---------------------------------------------------------------------------

describe("AC-004: imageUrl SSRF and https validation — non-https / private IP blocked before enqueue", () => {
  // Helper: test validation on standalone createWechatAssetsApp (no auth needed to test validation logic)
  // The route itself validates before enqueue; we test via the route directly here.

  it("returns 400 when imageUrl uses http:// (not https)", async () => {
    const enqueue = makeEnqueue();
    const app = createWechatAssetsApp({ enqueue: enqueue.mock } as WechatAssetsAppDeps);

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl: "http://cdn.example.com/img.png", type: "image" }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_INVALID_REQUEST");
    expect(enqueue.calls).toHaveLength(0);
  });

  it("returns 400 when imageUrl resolves to 10.x.x.x (private class A)", async () => {
    const enqueue = makeEnqueue();
    const app = createWechatAssetsApp({ enqueue: enqueue.mock } as WechatAssetsAppDeps);

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl: "https://10.0.0.1/img.png", type: "image" }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_INVALID_REQUEST");
    expect(enqueue.calls).toHaveLength(0);
  });

  it("returns 400 when imageUrl resolves to 192.168.x.x (private class C)", async () => {
    const enqueue = makeEnqueue();
    const app = createWechatAssetsApp({ enqueue: enqueue.mock } as WechatAssetsAppDeps);

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl: "https://192.168.1.100/img.png", type: "image" }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_INVALID_REQUEST");
    expect(enqueue.calls).toHaveLength(0);
  });

  it("returns 400 when imageUrl resolves to 172.16.x.x (private class B)", async () => {
    const enqueue = makeEnqueue();
    const app = createWechatAssetsApp({ enqueue: enqueue.mock } as WechatAssetsAppDeps);

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl: "https://172.20.5.9/img.png", type: "image" }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_INVALID_REQUEST");
    expect(enqueue.calls).toHaveLength(0);
  });

  it("does NOT block a public https imageUrl (control — SSRF validation passes, auth guard runs)", async () => {
    const token = await signUserJwt({ sub: "user:ssrf-control" });
    const enqueue = makeEnqueue();
    const app = createApp({
      auth: makeAuthDeps(),
      wechatAssets: { enqueue: enqueue.mock },
    } as Parameters<typeof createApp>[0]);

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ imageUrl: "https://cdn.example.com/img.png", type: "image" }),
    });

    // SSRF validation must not block a valid public URL
    expect(res.status).not.toBe(400);
    expect(enqueue.calls).toHaveLength(1);
  });

  it("returns 400 when imageUrl uses ftp:// scheme", async () => {
    const enqueue = makeEnqueue();
    const app = createWechatAssetsApp({ enqueue: enqueue.mock } as WechatAssetsAppDeps);

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl: "ftp://cdn.example.com/img.png", type: "image" }),
    });

    expect(res.status).toBe(400);
    expect(enqueue.calls).toHaveLength(0);
  });

  it("returns 400 when imageUrl is 172.31.255.255 (upper boundary of class B private)", async () => {
    const enqueue = makeEnqueue();
    const app = createWechatAssetsApp({ enqueue: enqueue.mock } as WechatAssetsAppDeps);

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl: "https://172.31.255.255/img.png", type: "image" }),
    });

    expect(res.status).toBe(400);
    expect(enqueue.calls).toHaveLength(0);
  });

  it("returns 400 when imageUrl host is 127.0.0.1 (loopback IPv4)", async () => {
    const enqueue = makeEnqueue();
    const app = createWechatAssetsApp({ enqueue: enqueue.mock } as WechatAssetsAppDeps);

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl: "https://127.0.0.1/img.png", type: "image" }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_INVALID_REQUEST");
    expect(enqueue.calls).toHaveLength(0);
  });

  it("returns 400 when imageUrl host is localhost (loopback hostname)", async () => {
    const enqueue = makeEnqueue();
    const app = createWechatAssetsApp({ enqueue: enqueue.mock } as WechatAssetsAppDeps);

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl: "https://localhost/img.png", type: "image" }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_INVALID_REQUEST");
    expect(enqueue.calls).toHaveLength(0);
  });

  it("returns 400 when imageUrl host is 169.254.x.x (IPv4 link-local)", async () => {
    const enqueue = makeEnqueue();
    const app = createWechatAssetsApp({ enqueue: enqueue.mock } as WechatAssetsAppDeps);

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl: "https://169.254.169.254/img.png", type: "image" }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_INVALID_REQUEST");
    expect(enqueue.calls).toHaveLength(0);
  });

  it("returns 400 when imageUrl host is 0.0.0.0 (special-use 0.0.0.0/8)", async () => {
    const enqueue = makeEnqueue();
    const app = createWechatAssetsApp({ enqueue: enqueue.mock } as WechatAssetsAppDeps);

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl: "https://0.0.0.0/img.png", type: "image" }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_INVALID_REQUEST");
    expect(enqueue.calls).toHaveLength(0);
  });

  it("returns 400 when imageUrl host is ::1 (IPv6 loopback)", async () => {
    const enqueue = makeEnqueue();
    const app = createWechatAssetsApp({ enqueue: enqueue.mock } as WechatAssetsAppDeps);

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl: "https://[::1]/img.png", type: "image" }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_INVALID_REQUEST");
    expect(enqueue.calls).toHaveLength(0);
  });

  it("returns 400 when imageUrl host is fe80:: (IPv6 link-local)", async () => {
    const enqueue = makeEnqueue();
    const app = createWechatAssetsApp({ enqueue: enqueue.mock } as WechatAssetsAppDeps);

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl: "https://[fe80::1]/img.png", type: "image" }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_INVALID_REQUEST");
    expect(enqueue.calls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// R-005: fail-closed — handler returns 401 when auth context is absent
// ---------------------------------------------------------------------------

describe("R-005: apiKeyId fail-closed — 401 when auth context is missing from handler", () => {
  it("returns 401 E_UNAUTHORIZED when handler is called without auth context (no auth middleware)", async () => {
    const enqueue = makeEnqueue();
    // Mount without auth so auth context is absent
    const app = createWechatAssetsApp({ enqueue: enqueue.mock } as WechatAssetsAppDeps);

    const res = await app.request("/api/v1/wechat-assets/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl: "https://cdn.example.com/img.png", type: "image" }),
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_UNAUTHORIZED");
    expect(enqueue.calls).toHaveLength(0);
  });
});
