/**
 * T-125 AC-008 — MCP HTTP transport token-resolver scope enforcement.
 * Verifies that createHttpTransportApp correctly enforces scope:
 *   - scope="user" → request passes to tool handler
 *   - scope="admin" → 403 E_FORBIDDEN (not allowed to call user tools)
 */
import { describe, expect, it } from "vitest";
import type { TokenResolver } from "../../apps/mcp-server/src/transport/http-sse.ts";
import { createHttpTransportApp } from "../../apps/mcp-server/src/transport/http-sse.ts";

// ---------------------------------------------------------------------------
// Shared resolver factories
// ---------------------------------------------------------------------------

/** Resolver that maps a known "user" Bearer token to scope "user". */
function makeUserResolver(userToken: string): TokenResolver {
  return {
    resolve: async (token) => {
      if (token === userToken) return "user";
      return null;
    },
  };
}

/** Resolver that maps a known "admin" Bearer token to scope "admin". */
function makeAdminResolver(adminToken: string): TokenResolver {
  return {
    resolve: async (token) => {
      if (token === adminToken) return "admin";
      return null;
    },
  };
}

/** Resolver that returns "user" for user tokens and "admin" for admin tokens. */
function makeDualResolver(userToken: string, adminToken: string): TokenResolver {
  return {
    resolve: async (token) => {
      if (token === userToken) return "user";
      if (token === adminToken) return "admin";
      return null;
    },
  };
}

// ---------------------------------------------------------------------------
// AC-008a: scope=user Bearer → request passes to tool handler (200)
// ---------------------------------------------------------------------------

describe("T-125 AC-008a: scope=user Bearer passes through to tool dispatcher", () => {
  it("returns 200 with tool result when resolver returns scope=user", async () => {
    const USER_TOKEN = "wf_user_token_abc123";
    const app = createHttpTransportApp({ tokenResolver: makeUserResolver(USER_TOKEN) });

    const res = await app.request("/mcp/tools/render_markdown", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${USER_TOKEN}`,
      },
      body: JSON.stringify({ markdown: "# Hello world" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { html: string };
    expect(typeof body.html).toBe("string");
    expect(body.html.length).toBeGreaterThan(0);
  });

  it("passes to a lightweight tool (get_ruleset_version) and returns 200 for user scope", async () => {
    const USER_TOKEN = "wf_user_ruleset_check";
    const app = createHttpTransportApp({ tokenResolver: makeUserResolver(USER_TOKEN) });

    const res = await app.request("/mcp/tools/get_ruleset_version", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${USER_TOKEN}`,
      },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// AC-008b: scope=admin Bearer → 403 E_FORBIDDEN
// ---------------------------------------------------------------------------

describe("T-125 AC-008b: scope=admin Bearer → 403 E_FORBIDDEN (admin cannot call user tools)", () => {
  it("returns 403 E_FORBIDDEN when resolver returns scope=admin for the token", async () => {
    const ADMIN_TOKEN = "wf_admin_token_xyz789";
    const app = createHttpTransportApp({ tokenResolver: makeAdminResolver(ADMIN_TOKEN) });

    const res = await app.request("/mcp/tools/render_markdown", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({ markdown: "# Admin attempt" }),
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_FORBIDDEN");
  });

  it("returns 403 for admin scope regardless of which tool is requested", async () => {
    const ADMIN_TOKEN = "wf_admin_list_themes";
    const app = createHttpTransportApp({ tokenResolver: makeAdminResolver(ADMIN_TOKEN) });

    const res = await app.request("/mcp/tools/list_themes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_FORBIDDEN");
  });
});

// ---------------------------------------------------------------------------
// AC-008c: unknown / invalid Bearer → 401 E_AUTH_REQUIRED
// ---------------------------------------------------------------------------

describe("T-125 AC-008c: unknown Bearer token → 401 E_AUTH_REQUIRED", () => {
  it("returns 401 E_AUTH_REQUIRED when resolver returns null for an unknown token", async () => {
    const USER_TOKEN = "wf_known_user_token";
    const app = createHttpTransportApp({ tokenResolver: makeUserResolver(USER_TOKEN) });

    const res = await app.request("/mcp/tools/render_markdown", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer wf_unknown_token_not_in_store",
      },
      body: JSON.stringify({ markdown: "# test" }),
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_AUTH_REQUIRED");
  });

  it("returns 401 E_AUTH_REQUIRED when no Authorization header is present and resolver returns null", async () => {
    // Resolver that always rejects (simulating a non-passthrough production resolver)
    const strictResolver: TokenResolver = {
      resolve: async (_token) => null,
    };
    const app = createHttpTransportApp({ tokenResolver: strictResolver });

    const res = await app.request("/mcp/tools/render_markdown", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markdown: "# test" }),
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_AUTH_REQUIRED");
  });
});

// ---------------------------------------------------------------------------
// AC-008d: dual-resolver correctly differentiates user vs admin
// ---------------------------------------------------------------------------

describe("T-125 AC-008d: dual-resolver differentiates user (200) from admin (403)", () => {
  it("user token gets 200, admin token gets 403 from the same app instance", async () => {
    const USER_TOKEN = "wf_user_dual_test";
    const ADMIN_TOKEN = "wf_admin_dual_test";
    const app = createHttpTransportApp({
      tokenResolver: makeDualResolver(USER_TOKEN, ADMIN_TOKEN),
    });

    // User token → 200
    const userRes = await app.request("/mcp/tools/render_markdown", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${USER_TOKEN}`,
      },
      body: JSON.stringify({ markdown: "# User test" }),
    });
    expect(userRes.status).toBe(200);
    const userBody = (await userRes.json()) as { html: string };
    expect(typeof userBody.html).toBe("string");

    // Admin token → 403
    const adminRes = await app.request("/mcp/tools/render_markdown", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({ markdown: "# Admin test" }),
    });
    expect(adminRes.status).toBe(403);
    const adminBody = (await adminRes.json()) as { error: { code: string } };
    expect(adminBody.error.code).toBe("E_FORBIDDEN");
  });
});
