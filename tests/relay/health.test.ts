import { Hono } from "hono";
import { describe, expect, it } from "vitest";
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
});
