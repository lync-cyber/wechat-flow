import { describe, expect, it } from "vitest";
import { describeTokenTool } from "../../../apps/mcp-server/src/tools/describe-token.ts";
import { listTokensTool } from "../../../apps/mcp-server/src/tools/list-tokens.ts";
import { describeToken, listTokens } from "../../../packages/core/src/registry/token.ts";

// ---- AC-001: list_tokens 返回 ≥60 token，每项含 id 与 category ----

describe("AC-001: listTokensTool 返回 ≥60 tokens，每项含 id 与合法 category", () => {
  it("返回对象包含 tokens 数组，长度 ≥60", () => {
    const result = listTokensTool({}) as { tokens: Array<{ id: string; category: string }> };
    expect(Array.isArray(result.tokens)).toBe(true);
    expect(result.tokens.length).toBeGreaterThanOrEqual(60);
  });

  it("每个 token 含非空 id 字符串", () => {
    const result = listTokensTool({}) as { tokens: Array<{ id: string; category: string }> };
    for (const token of result.tokens) {
      expect(typeof token.id).toBe("string");
      expect(token.id.length).toBeGreaterThan(0);
    }
  });

  it("每个 token 的 category 属于合法枚举值", () => {
    const validCategories = new Set(["color", "spacing", "font", "decoration", "alignment"]);
    const result = listTokensTool({}) as { tokens: Array<{ id: string; category: string }> };
    for (const token of result.tokens) {
      expect(validCategories.has(token.category)).toBe(true);
    }
  });
});

// ---- AC-002: describe_token('color.brand') 返回正确结构 ----

describe("AC-002: describeTokenTool('color.brand') 返回完整 TokenDefinition", () => {
  it("返回 id='color.brand'、category='color'、value='#2D5A4E'", () => {
    const result = describeTokenTool({ id: "color.brand" }) as {
      id: string;
      category: string;
      value: string;
    };
    expect(result.id).toBe("color.brand");
    expect(result.category).toBe("color");
    expect(result.value).toBe("#2D5A4E");
  });

  it("返回对象含 id、category、value 三个必填字段", () => {
    const result = describeTokenTool({ id: "color.brand" }) as Record<string, unknown>;
    expect(typeof result.id).toBe("string");
    expect(typeof result.category).toBe("string");
    expect(typeof result.value).toBe("string");
  });

  it("未命中 id 返回 { code: 'E_NOT_FOUND', id }", () => {
    const result = describeTokenTool({ id: "no.such.token" }) as Record<string, unknown>;
    expect(result.code).toBe("E_NOT_FOUND");
    expect(result.id).toBe("no.such.token");
  });

  it("缺省 id（args 无 id）→ 空串后 E_NOT_FOUND", () => {
    const result = describeTokenTool({}) as Record<string, unknown>;
    expect(result.code).toBe("E_NOT_FOUND");
    expect(result.id).toBe("");
  });
});

// ---- AC-003: tool 仅调用 M-005 注册中心 API，不含业务逻辑 ----

describe("AC-003: tool 直接委托 core registry，结果与 registry API 一致", () => {
  it("listTokensTool().tokens 与 listTokens() 返回内容完全一致", () => {
    const toolResult = listTokensTool({}) as { tokens: Array<{ id: string }> };
    const registryResult = listTokens();
    expect(toolResult.tokens).toEqual(registryResult);
  });

  it("describeTokenTool 命中时结果与 describeToken() 一致", () => {
    const toolResult = describeTokenTool({ id: "color.brand" });
    const registryResult = describeToken("color.brand");
    expect(toolResult).toEqual(registryResult);
  });

  it("describeTokenTool 未命中时不等于 undefined（转换为 E_NOT_FOUND 对象）", () => {
    const toolResult = describeTokenTool({ id: "not.exists" }) as Record<string, unknown>;
    expect(toolResult).not.toBeUndefined();
    expect(toolResult.code).toBe("E_NOT_FOUND");
  });
});
