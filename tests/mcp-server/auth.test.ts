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
    const result = await dispatchTool("__unimplemented_sentinel__", {}, { scope: "user" });
    expect(result).toHaveProperty("code", "E_NOT_IMPLEMENTED");
  });
});

// ---- SR-005: E_NOT_FOUND is treated as isError in MCP responses ----

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { hashApiKey as hashKey } from "../../apps/mcp-server/src/auth/api-key.ts";
import { createServer } from "../../apps/mcp-server/src/transport/stdio.ts";

describe("SR-005: describe_token with unknown id → MCP isError=true", () => {
  it("returns isError=true when describe_token finds no matching token", async () => {
    const raw = "user-key-sr005";
    const apiKeyStore = new Map([[hashKey(raw), { scope: "user" as const }]]);
    const server = createServer({ apiKeyStore, rawApiKey: raw });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    const client = new Client({ name: "test-client", version: "0.0.0" });
    await client.connect(clientTransport);

    const res = await client.callTool({
      name: "describe_token",
      arguments: { id: "no.such.token.xyz" },
    });
    expect(res.isError).toBe(true);

    await client.close();
  });
});
