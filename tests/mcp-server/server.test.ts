import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it, vi } from "vitest";
import { hashApiKey } from "../../apps/mcp-server/src/auth/api-key.ts";
import { main } from "../../apps/mcp-server/src/index.ts";
import { createServer } from "../../apps/mcp-server/src/transport/stdio.ts";
import { TOTAL_TOOL_COUNT } from "../../packages/contracts/src/index.ts";

// ---- AC-001: stdio transport responds to initialize with all registered tools ----

describe("AC-001: MCP server initialize returns all 24 tools", () => {
  it("client.listTools() over an in-process transport pair returns every registered tool", async () => {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);

    const client = new Client({ name: "test-client", version: "0.0.0" });
    await client.connect(clientTransport);

    const { tools } = await client.listTools();
    expect(tools).toHaveLength(TOTAL_TOOL_COUNT);

    await client.close();
  });
});

// ---- AC-002/AC-003: end-to-end auth via InMemoryTransport + Client.callTool ----

async function callToolWithServer(
  serverDeps: Parameters<typeof createServer>[0],
  toolName: string
): Promise<string> {
  const server = createServer(serverDeps);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await client.connect(clientTransport);
  const res = await client.callTool({ name: toolName, arguments: {} });
  await client.close();
  const text = (res.content as Array<{ type: string; text: string }>)[0].text;
  return JSON.parse(text).code as string;
}

describe("AC-002: end-to-end — no key → E_AUTH_REQUIRED", () => {
  it("createServer() with no key store → callTool returns E_AUTH_REQUIRED", async () => {
    const code = await callToolWithServer(undefined, "list_tokens");
    expect(code).toBe("E_AUTH_REQUIRED");
  });
});

describe("AC-003: end-to-end — admin key → E_PERMISSION_DENIED", () => {
  it("createServer() with admin key → callTool returns E_PERMISSION_DENIED", async () => {
    const raw = "admin-key";
    const apiKeyStore = new Map([[hashApiKey(raw), { scope: "admin" as const }]]);
    const code = await callToolWithServer({ apiKeyStore, rawApiKey: raw }, "list_tokens");
    expect(code).toBe("E_PERMISSION_DENIED");
  });
});

describe("AC-002/AC-003: end-to-end — valid user key → handler executes (auth passes)", () => {
  it("createServer() with valid user key → callTool list_tokens returns tokens array (not an error code)", async () => {
    const raw = "user-key";
    const apiKeyStore = new Map([[hashApiKey(raw), { scope: "user" as const }]]);
    const server = createServer({ apiKeyStore, rawApiKey: raw });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    const client = new Client({ name: "test-client", version: "0.0.0" });
    await client.connect(clientTransport);
    const res = await client.callTool({ name: "list_tokens", arguments: {} });
    await client.close();
    const text = (res.content as Array<{ type: string; text: string }>)[0].text;
    const payload = JSON.parse(text) as Record<string, unknown>;
    expect(payload.code).toBeUndefined();
    expect(Array.isArray(payload.tokens)).toBe(true);
    expect((payload.tokens as unknown[]).length).toBeGreaterThanOrEqual(60);
  });
});

// ---- AC-004: production path — main() invokes the stdio transport starter ----

describe("AC-004: index.ts main() wires to startStdioTransport", () => {
  it("main() invokes its transport starter exactly once", async () => {
    const start = vi.fn().mockResolvedValue(undefined);
    await main(start);
    expect(start).toHaveBeenCalledOnce();
  });
});
