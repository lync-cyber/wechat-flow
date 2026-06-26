import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { hashApiKey } from "../../../apps/mcp-server/src/auth/api-key.ts";
import { applyZhTypoTool } from "../../../apps/mcp-server/src/tools/apply-zh-typo.ts";
import { createServer } from "../../../apps/mcp-server/src/transport/stdio.ts";

const SAMPLE = "这是GitHub的项目";

describe("AC-001: applyZhTypoTool direct call", () => {
  it("returns correct fixed, perRule['zh-en-space'], and totalChanges for zh-en-space input", async () => {
    const result = await applyZhTypoTool({ markdown: SAMPLE });
    expect(result.fixed).toBe("这是 GitHub 的项目");
    expect((result.perRule as Record<string, number>)["zh-en-space"]).toBe(2);
    expect(result.totalChanges).toBe(2);
  });
});

describe("AC-001 e2e: apply_zh_typo via InMemoryTransport callTool", () => {
  it("callTool apply_zh_typo returns correct fixed/perRule/totalChanges", async () => {
    const raw = "user-key";
    const apiKeyStore = new Map([[hashApiKey(raw), { scope: "user" as const }]]);
    const server = createServer({ apiKeyStore, rawApiKey: raw });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    const client = new Client({ name: "test-client", version: "0.0.0" });
    await client.connect(clientTransport);

    const res = await client.callTool({
      name: "apply_zh_typo",
      arguments: { markdown: SAMPLE },
    });
    await client.close();

    const text = (res.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text) as {
      fixed: string;
      perRule: Record<string, number>;
      totalChanges: number;
    };
    expect(parsed.fixed).toBe("这是 GitHub 的项目");
    expect(parsed.perRule["zh-en-space"]).toBe(2);
    expect(parsed.totalChanges).toBe(2);
  });
});

describe("R-007 e2e: apply_zh_typo multi-rule sample", () => {
  it("callTool serializes full-width chars correctly for multi-rule input and perRule has multiple keys", async () => {
    const raw = "user-key";
    const apiKeyStore = new Map([[hashApiKey(raw), { scope: "user" as const }]]);
    const server = createServer({ apiKeyStore, rawApiKey: raw });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    const client = new Client({ name: "test-client", version: "0.0.0" });
    await client.connect(clientTransport);

    const multiRuleSample = '这是GitHub的"测试"项目...';
    const res = await client.callTool({
      name: "apply_zh_typo",
      arguments: { markdown: multiRuleSample },
    });
    await client.close();

    const text = (res.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text) as {
      fixed: string;
      perRule: Record<string, number>;
      totalChanges: number;
    };

    expect(parsed.perRule["zh-en-space"]).toBeGreaterThanOrEqual(1);
    expect(parsed.perRule["smart-quotes"]).toBeGreaterThanOrEqual(1);
    expect(parsed.perRule["ellipsis-dash"]).toBeGreaterThanOrEqual(1);
    expect(parsed.fixed).toContain(" GitHub ");
    expect(parsed.fixed).toContain("……");
    const fixedChars = [...parsed.fixed].map((c) => c.charCodeAt(0));
    expect(fixedChars).toContain(0x201c);
    expect(fixedChars).toContain(0x201d);
    expect(fixedChars).toContain(0x2026);
  });
});
