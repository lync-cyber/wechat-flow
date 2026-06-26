import { describe, expect, it } from "vitest";
import type { TokenResolver } from "../../apps/mcp-server/src/transport/http-sse.ts";
import { createHttpTransportApp } from "../../apps/mcp-server/src/transport/http-sse.ts";

// AC-001: MCP HTTP transport dispatch renders markdown and returns HTTP 200

describe("T-051 AC-001: HTTP transport POST /mcp/tools/render_markdown", () => {
  it("returns rendered html with HTTP 200 for a valid markdown payload", async () => {
    const app = createHttpTransportApp();
    const res = await app.request("/mcp/tools/render_markdown", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markdown: "# Hello" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { html: string; diagnostics?: unknown[] };
    expect(typeof body.html).toBe("string");
    expect(body.html.length).toBeGreaterThan(0);
  });

  it("returns 400 when request body is not valid JSON", async () => {
    const app = createHttpTransportApp();
    const res = await app.request("/mcp/tools/render_markdown", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ not valid json",
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_INVALID_JSON");
  });

  it("returns 404 for an unknown tool name", async () => {
    const app = createHttpTransportApp();
    const res = await app.request("/mcp/tools/unknown_tool_xyz", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_NOT_FOUND");
  });
});

// R-008: empty body branch — POST with no body must not crash

describe("R-008: HTTP transport handles empty request body", () => {
  it("POST with no body (empty string) passes {} to handler and returns a valid response", async () => {
    const app = createHttpTransportApp();
    const res = await app.request("/mcp/tools/render_markdown", {
      method: "POST",
      headers: { "content-type": "application/json" },
      // No body — empty
    });

    // render_markdown with {} args (missing markdown) returns an error or success; either way
    // the transport must not crash with a JSON parse error (not 400 E_INVALID_JSON)
    const body = (await res.json()) as { error?: { code: string } };
    if (body.error) {
      expect(body.error.code).not.toBe("E_INVALID_JSON");
    } else {
      // If somehow it succeeds (e.g. empty html), status is 200
      expect(res.status).toBe(200);
    }
  });

  it("POST with Content-Length: 0 body does not return E_INVALID_JSON", async () => {
    const app = createHttpTransportApp();
    const res = await app.request("/mcp/tools/render_markdown", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "0" },
      body: "",
    });

    const body = (await res.json()) as { error?: { code: string } };
    if (body.error) {
      expect(body.error.code).not.toBe("E_INVALID_JSON");
    } else {
      expect(res.status).toBe(200);
    }
  });
});

// R-003: injectable token resolver

describe("R-003: HTTP transport token resolver injection", () => {
  it("returns 401 E_AUTH_REQUIRED when injected resolver rejects the token", async () => {
    const rejectingResolver: TokenResolver = {
      resolve: async (_token) => null,
    };
    const app = createHttpTransportApp({ tokenResolver: rejectingResolver });

    const res = await app.request("/mcp/tools/render_markdown", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markdown: "# Hi" }),
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_AUTH_REQUIRED");
  });

  it("passes through when injected resolver returns a scope string", async () => {
    const acceptingResolver: TokenResolver = {
      resolve: async (_token) => "user",
    };
    const app = createHttpTransportApp({ tokenResolver: acceptingResolver });

    const res = await app.request("/mcp/tools/render_markdown", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer wf_testtoken" },
      body: JSON.stringify({ markdown: "# Hi" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { html: string };
    expect(typeof body.html).toBe("string");
  });

  it("default resolver (no tokenResolver injected) allows requests with no auth header", async () => {
    // Default passthrough resolver accepts all traffic (wiring-placeholder behavior)
    const app = createHttpTransportApp();

    const res = await app.request("/mcp/tools/render_markdown", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markdown: "# Hi" }),
    });

    expect(res.status).toBe(200);
  });
});
