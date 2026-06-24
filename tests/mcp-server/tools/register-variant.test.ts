import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeEach, describe, expect, it } from "vitest";
import { hashApiKey } from "../../../apps/mcp-server/src/auth/api-key.ts";
import { createServer } from "../../../apps/mcp-server/src/transport/stdio.ts";
import { resetVariantRegistry } from "../../../packages/core/src/registry/variant.ts";

const RAW_KEY = "user-key";

async function callRegisterVariant(
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const apiKeyStore = new Map([[hashApiKey(RAW_KEY), { scope: "user" as const }]]);
  const server = createServer({ apiKeyStore, rawApiKey: RAW_KEY });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await client.connect(clientTransport);
  const res = await client.callTool({ name: "register_variant", arguments: args });
  await client.close();
  const text = (res.content as Array<{ type: string; text: string }>)[0].text;
  return JSON.parse(text) as Record<string, unknown>;
}

beforeEach(() => {
  resetVariantRegistry();
});

describe("AC-001: 合法注册经 stdio transport 返回 registered:true", () => {
  it("register_variant(callout, my:dark, root style) → { registered: true, variantId, rejectedDeclarations: [] }", async () => {
    const res = await callRegisterVariant({
      blockId: "callout",
      variantId: "my:dark",
      label: "Dark",
      style: { root: { "background-color": "#1a1a1a" } },
    });
    expect(res.registered).toBe(true);
    expect(res.variantId).toBe("my:dark");
    expect(res.rejectedDeclarations).toEqual([]);
  });
});

describe("AC-002: 白名单外属性返回 registered:false + rejectedDeclarations，无部分注册", () => {
  it("style 含 position:fixed → registered:false，rejectedDeclarations 含 slot/property/value/reason", async () => {
    const res = await callRegisterVariant({
      blockId: "callout",
      variantId: "bad:variant",
      label: "Bad",
      style: { root: { position: "fixed" } },
    });
    expect(res.registered).toBe(false);
    expect(res.variantId).toBe("bad:variant");
    const rejected = res.rejectedDeclarations as Array<Record<string, unknown>>;
    expect(Array.isArray(rejected)).toBe(true);
    expect(rejected.length).toBeGreaterThan(0);
    expect(rejected[0]).toHaveProperty("slot");
    expect(rejected[0]).toHaveProperty("property");
    expect(rejected[0]).toHaveProperty("value");
    expect(rejected[0]).toHaveProperty("reason");
  });

  it("拒绝后无部分注册：同 variantId 用合法 style 重注册成功", async () => {
    await callRegisterVariant({
      blockId: "callout",
      variantId: "bad:variant",
      label: "Bad",
      style: { root: { position: "fixed" } },
    });
    const retry = await callRegisterVariant({
      blockId: "callout",
      variantId: "bad:variant",
      label: "Fixed",
      style: { root: { color: "#000000" } },
    });
    expect(retry.registered).toBe(true);
  });
});

describe("AC-003: blockId 不存在返回 E_BLOCK_NOT_FOUND", () => {
  it("register_variant(no-such-block, ...) → { code: 'E_BLOCK_NOT_FOUND' }", async () => {
    const res = await callRegisterVariant({
      blockId: "no-such-block",
      variantId: "my:dark",
      label: "Dark",
      style: { root: { color: "#000000" } },
    });
    expect(res.code).toBe("E_BLOCK_NOT_FOUND");
  });
});

describe("AC-004: 重复注册返回 E_VARIANT_CONFLICT，现有条目不变", () => {
  it("同 (blockId, variantId) 二次注册 → { code: 'E_VARIANT_CONFLICT' }", async () => {
    const first = await callRegisterVariant({
      blockId: "callout",
      variantId: "my:dark",
      label: "Dark",
      style: { root: { "background-color": "#1a1a1a" } },
    });
    expect(first.registered).toBe(true);
    const second = await callRegisterVariant({
      blockId: "callout",
      variantId: "my:dark",
      label: "Dark v2",
      style: { root: { "background-color": "#000000" } },
    });
    expect(second.code).toBe("E_VARIANT_CONFLICT");
  });

  it("命中内置 variant（callout filled）也算冲突 → E_VARIANT_CONFLICT", async () => {
    const res = await callRegisterVariant({
      blockId: "callout",
      variantId: "filled",
      label: "Filled",
      style: { root: { "background-color": "#000000" } },
    });
    expect(res.code).toBe("E_VARIANT_CONFLICT");
  });
});

describe("AC-005: 未声明槽位键返回 E_SLOT_UNKNOWN", () => {
  it("style 含 unknown-slot → { code: 'E_SLOT_UNKNOWN' }", async () => {
    const res = await callRegisterVariant({
      blockId: "callout",
      variantId: "my:dark",
      label: "Dark",
      style: { "unknown-slot": { color: "#000000" } },
    });
    expect(res.code).toBe("E_SLOT_UNKNOWN");
  });
});

describe("AC-006: 入参 schema 校验失败返回 E_SCHEMA", () => {
  it("blockId 为空字符串 → { code: 'E_SCHEMA' }", async () => {
    const res = await callRegisterVariant({
      blockId: "",
      variantId: "my:dark",
      label: "Dark",
      style: { root: { color: "#000000" } },
    });
    expect(res.code).toBe("E_SCHEMA");
  });

  it("variantId 为空字符串 → { code: 'E_SCHEMA' }", async () => {
    const res = await callRegisterVariant({
      blockId: "callout",
      variantId: "",
      label: "Dark",
      style: { root: { color: "#000000" } },
    });
    expect(res.code).toBe("E_SCHEMA");
  });

  it("style 为空 map → { code: 'E_SCHEMA' }", async () => {
    const res = await callRegisterVariant({
      blockId: "callout",
      variantId: "my:dark",
      label: "Dark",
      style: {},
    });
    expect(res.code).toBe("E_SCHEMA");
  });
});

describe("AC-007: production path — register_variant 已挂载到 router", () => {
  it("apps/mcp-server/src/tools/router.ts 含 register_variant 注册语句", () => {
    const src = readFileSync(join(process.cwd(), "apps/mcp-server/src/tools/router.ts"), "utf-8");
    expect(src).toMatch(/register_variant/);
  });
});
