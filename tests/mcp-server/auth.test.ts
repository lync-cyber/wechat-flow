import { describe, expect, it } from "vitest";
import {
  type ApiKeyStore,
  hashApiKey,
  verifyApiKey,
} from "../../apps/mcp-server/src/auth/api-key.ts";
import { guardUserScope } from "../../apps/mcp-server/src/auth/scope-guard.ts";
import { dispatchTool } from "../../apps/mcp-server/src/tools/router.ts";

// ---- AC-002 & AC-003 ----

describe("verifyApiKey", () => {
  it("returns null when raw is undefined", () => {
    const store: ApiKeyStore = new Map();
    expect(verifyApiKey(undefined, store)).toBeNull();
  });

  it("returns null when key hash not in store", () => {
    const store: ApiKeyStore = new Map();
    expect(verifyApiKey("unknown-key", store)).toBeNull();
  });

  it("returns record when key hash matches", () => {
    const raw = "my-secret-key";
    const store: ApiKeyStore = new Map([[hashApiKey(raw), { scope: "user" }]]);
    expect(verifyApiKey(raw, store)).toEqual({ scope: "user" });
  });

  it("returns admin record when scope is admin", () => {
    const raw = "admin-key";
    const store: ApiKeyStore = new Map([[hashApiKey(raw), { scope: "admin" }]]);
    expect(verifyApiKey(raw, store)).toEqual({ scope: "admin" });
  });
});

describe("guardUserScope", () => {
  it("returns E_AUTH_REQUIRED when keyRecord is null", () => {
    const result = guardUserScope(null);
    expect(result?.code).toBe("E_AUTH_REQUIRED");
  });

  it("returns E_PERMISSION_DENIED when keyRecord has scope=admin", () => {
    const result = guardUserScope({ scope: "admin" });
    expect(result?.code).toBe("E_PERMISSION_DENIED");
  });

  it("returns null when keyRecord has scope=user", () => {
    const result = guardUserScope({ scope: "user" });
    expect(result).toBeNull();
  });
});

describe("dispatchTool — AC-002: no valid key → E_AUTH_REQUIRED", () => {
  it("returns E_AUTH_REQUIRED when keyRecord is null", async () => {
    const result = await dispatchTool("render_markdown", {}, null);
    expect(result).toHaveProperty("code", "E_AUTH_REQUIRED");
  });
});

describe("dispatchTool — AC-003: admin scope → E_PERMISSION_DENIED", () => {
  it("returns E_PERMISSION_DENIED when scope is admin", async () => {
    const result = await dispatchTool("render_markdown", {}, { scope: "admin" });
    expect(result).toHaveProperty("code", "E_PERMISSION_DENIED");
  });

  it("returns E_NOT_IMPLEMENTED (not auth error) for unimplemented tool when scope is user", async () => {
    const result = await dispatchTool("list_tokens", {}, { scope: "user" });
    expect(result).toHaveProperty("code", "E_NOT_IMPLEMENTED");
  });
});
