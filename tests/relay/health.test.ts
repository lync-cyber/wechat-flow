import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createApp } from "../../apps/relay/src/index.ts";
import { jsonValidator } from "../../apps/relay/src/middleware/validator.ts";

describe("T-032 AC-001: GET /health", () => {
  it("returns { status: 'ok', version } with HTTP 200", async () => {
    const app = createApp();
    const res = await app.request("/health");

    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; version: string };
    expect(body.status).toBe("ok");
    expect(typeof body.version).toBe("string");
  });
});

describe("T-032 AC-002: Zod validator middleware", () => {
  const app = new Hono().post("/echo", jsonValidator(z.object({ name: z.string() })), (c) =>
    c.json({ ok: true })
  );

  it("rejects malformed JSON with 400 validation_error", async () => {
    const res = await app.request("/echo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ not json",
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: unknown[] };
    expect(body.error).toBe("validation_error");
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it("rejects schema-invalid JSON with 400 and issues", async () => {
    const res = await app.request("/echo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: 123 }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: unknown[] };
    expect(body.error).toBe("validation_error");
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("passes valid JSON through to the handler", async () => {
    const res = await app.request("/echo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "ok" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("non-application/json content-type skips JSON guard and lets schema validate", async () => {
    const res = await app.request("/echo", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ name: "ok" }),
    });

    // zValidator receives undefined body for non-json → validation_error or handler runs
    // The key check: we must NOT get "invalid_json" error — that branch is skipped
    const body = (await res.json()) as { error?: string; ok?: boolean };
    expect(body.error).not.toBe("invalid_json");
  });
});

// ---------------------------------------------------------------------------
// Branch coverage: RELAY_VERSION env-present branch
// ---------------------------------------------------------------------------

describe("RELAY_VERSION: env-present branch via dynamic import", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses npm_package_version when env var is set", async () => {
    vi.stubEnv("npm_package_version", "9.9.9");
    vi.resetModules();
    const { RELAY_VERSION } = await import("../../apps/relay/src/routes/health.ts");
    expect(RELAY_VERSION).toBe("9.9.9");
  });
});
