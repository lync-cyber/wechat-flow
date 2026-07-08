import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { hashApiKey } from "../../../apps/mcp-server/src/auth/api-key.ts";
import { registerBuiltins } from "../../../apps/mcp-server/src/bootstrap.ts";
import type { DescribeBlockResult } from "../../../apps/mcp-server/src/tools/describe-block.ts";
import { describeBlockTool } from "../../../apps/mcp-server/src/tools/describe-block.ts";
import { describeMarkTool } from "../../../apps/mcp-server/src/tools/describe-mark.ts";
import { describeThemeTool } from "../../../apps/mcp-server/src/tools/describe-theme.ts";
import { lintMarkdownTool } from "../../../apps/mcp-server/src/tools/lint-markdown.ts";
import { listBlocksTool } from "../../../apps/mcp-server/src/tools/list-blocks.ts";
import { listMarksTool } from "../../../apps/mcp-server/src/tools/list-marks.ts";
import { listThemesTool } from "../../../apps/mcp-server/src/tools/list-themes.ts";
import { createServer } from "../../../apps/mcp-server/src/transport/stdio.ts";
import {
  describeBlock as coreDescribeBlock,
  registerBlock as coreRegisterBlock,
  listBlocks,
  resetBlockRegistry,
} from "../../../packages/core/src/registry/block.ts";
import { createPluginSurface } from "../../../packages/plugin-api/src/surface/plugin-api.ts";

beforeAll(() => {
  registerBuiltins();
});

// ---- AC-001: list_themes → 数组长度 ≥5，每项含 id、name ----

describe("AC-001: list_themes returns ≥5 themes each with id and name", () => {
  it("listThemesTool returns array with at least 5 themes", () => {
    const themes = listThemesTool({}) as Array<{ id: string; name: string }>;
    expect(Array.isArray(themes)).toBe(true);
    expect(themes.length).toBeGreaterThanOrEqual(5);
    for (const theme of themes) {
      expect(typeof theme.id).toBe("string");
      expect(theme.id.length).toBeGreaterThan(0);
      expect(typeof theme.name).toBe("string");
      expect(theme.name.length).toBeGreaterThan(0);
    }
  });
});

// ---- AC-002: describe_block('pull-quote') → attrsSchema type:object, properties 非空（directiveAttrs 语法域） ----

describe("AC-002: describe_block(pull-quote) returns attrsSchema as JSON Schema object with non-empty properties", () => {
  it("describeBlockTool({ blockId: 'pull-quote' }) has attrsSchema with type:object and non-empty properties", () => {
    const result = describeBlockTool({ blockId: "pull-quote" }) as Record<string, unknown>;
    expect(result).toHaveProperty("attrsSchema");
    const schema = result.attrsSchema as Record<string, unknown>;
    expect(schema.type).toBe("object");
    expect(typeof schema.properties).toBe("object");
    expect(schema.properties).not.toBeNull();
    expect(Object.keys(schema.properties as object).length).toBeGreaterThan(0);
  });
});

// ---- AC-003: list_marks → 长度 ≥11，含 badge、highlight ----

describe("AC-003: list_marks returns ≥11 marks including badge and highlight", () => {
  it("listMarksTool returns array with at least 11 marks", () => {
    const marks = listMarksTool({}) as Array<{ id: string; name: string }>;
    expect(Array.isArray(marks)).toBe(true);
    expect(marks.length).toBeGreaterThanOrEqual(11);
    const ids = marks.map((m) => m.id);
    expect(ids).toContain("badge");
    expect(ids).toContain("highlight");
  });
});

// ---- AC-004: list_blocks → 长度 ≥25 ----

describe("AC-004: list_blocks returns ≥25 blocks", () => {
  it("listBlocksTool returns array with at least 25 blocks", () => {
    const blocks = listBlocksTool({}) as Array<{ id: string; name: string }>;
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBeGreaterThanOrEqual(25);
  });
});

// ---- AC-005/007: describe_theme('default') → paintable 存在 + templates 含已注册 template ----

describe("AC-005/007: describe_theme(default) has paintable field and templates array", () => {
  it("describeThemeTool({ id: 'default' }) has paintable field and templates with at least one entry", () => {
    const result = describeThemeTool({ id: "default" }) as Record<string, unknown>;
    expect(result).toHaveProperty("paintable");
    expect(result).toHaveProperty("templates");
    expect(Array.isArray(result.templates)).toBe(true);
    const templates = result.templates as Array<{
      templateId: string;
      description: string | undefined;
    }>;
    expect(templates.length).toBeGreaterThanOrEqual(1);
    expect(typeof templates[0].templateId).toBe("string");
    expect(templates[0].templateId.length).toBeGreaterThan(0);
  });
});

// ---- AC-006: describe_mark('badge') → attrsSchema 是 JSON Schema ----

describe("AC-006: describe_mark(badge) returns attrsSchema as JSON Schema", () => {
  it("describeMarkTool({ markId: 'badge' }) has attrsSchema with type:object", () => {
    const result = describeMarkTool({ markId: "badge" }) as Record<string, unknown>;
    expect(result).toHaveProperty("attrsSchema");
    const schema = result.attrsSchema as Record<string, unknown>;
    expect(schema.type).toBe("object");
    expect(typeof schema.properties).toBe("object");
  });
});

// ---- 错误/默认路径分支：describe_mark 未命中、lint_markdown 缺省入参 ----

describe("describe_mark / lint_markdown 边界路径", () => {
  it("describe_mark 未知 markId → { code: 'E_NOT_FOUND' }", () => {
    const result = describeMarkTool({ markId: "no-such-mark" }) as Record<string, unknown>;
    expect(result.code).toBe("E_NOT_FOUND");
    expect(result.markId).toBe("no-such-mark");
  });

  it("describe_mark 缺省 markId（args 无 markId）→ markId 落空串后 E_NOT_FOUND", () => {
    const result = describeMarkTool({}) as Record<string, unknown>;
    expect(result.code).toBe("E_NOT_FOUND");
    expect(result.markId).toBe("");
  });

  it("lint_markdown 缺省 markdown/themeId/customCss → 返回 diagnostics 数组", async () => {
    const result = (await lintMarkdownTool({})) as { diagnostics: unknown };
    expect(Array.isArray(result.diagnostics)).toBe(true);
  });
});

// ---- AC-002 (T-135): describe_block(callout) → category 字段与注册值一致 ----

describe("AC-002: describe_block(callout) includes category matching registration", () => {
  it("describeBlockTool({ blockId: 'callout' }) has category 'emphasis'", () => {
    const result = describeBlockTool({ blockId: "callout" }) as Record<string, unknown>;
    expect(result).toHaveProperty("category");
    expect(result.category).toBe("emphasis");
  });
});

// ---- AC-003 (T-135): describe_block 未注册 blockId → E_NOT_FOUND 结构不受 category 新增影响 ----

describe("AC-003: describe_block unknown blockId still returns E_NOT_FOUND shape", () => {
  it("describeBlockTool({ blockId: 'no-such-block' }) returns { code: 'E_NOT_FOUND', blockId }", () => {
    const result = describeBlockTool({ blockId: "no-such-block" }) as Record<string, unknown>;
    expect(result.code).toBe("E_NOT_FOUND");
    expect(result.blockId).toBe("no-such-block");
    expect(result).not.toHaveProperty("category");
  });
});

// ---- E2E: list_themes via callTool → content 解析后数组≥5 ----

describe("E2E: list_themes via InMemoryTransport + callTool", () => {
  it("callTool list_themes over InMemoryTransport returns parsed array with ≥5 themes", async () => {
    const raw = "user-key";
    const apiKeyStore = new Map([[hashApiKey(raw), { scope: "user" as const }]]);
    const server = createServer({ apiKeyStore, rawApiKey: raw });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    const client = new Client({ name: "test-client", version: "0.0.0" });
    await client.connect(clientTransport);

    const res = await client.callTool({ name: "list_themes", arguments: {} });
    await client.close();

    const text = (res.content as Array<{ type: string; text: string }>)[0].text;
    const themes = JSON.parse(text) as Array<{ id: string; name: string }>;
    expect(Array.isArray(themes)).toBe(true);
    expect(themes.length).toBeGreaterThanOrEqual(5);
  });
});

// ---- T-173 AC-001: describe_block 输出 source 判别字段 ----

describe("T-173 AC-001: describe_block 输出 source 判别字段", () => {
  it("经内置注册路径（packages/blocks factory defineBlock）的 40 块均输出 source='builtin'", () => {
    const builtinIds = listBlocks().map((b) => b.id);
    expect(builtinIds.length).toBeGreaterThanOrEqual(40);
    for (const id of builtinIds) {
      const result = describeBlockTool({ blockId: id }) as Record<string, unknown>;
      expect(result.source).toBe("builtin");
    }
  });

  it("经 plugin-api defineBlock 注册进 core registry 的块输出 source='plugin'", () => {
    const surface = createPluginSurface({
      registerBlock: coreRegisterBlock,
      describeBlock: coreDescribeBlock,
      registerVariant: () => {},
      listBlockVariants: () => [],
    });

    surface.defineBlock({
      id: "t173-plugin-probe-block",
      name: "T-173 Plugin Probe",
      category: "text",
      attrsSchema: z.object({ title: z.string() }),
      render: () => "<div></div>",
    });

    const result = describeBlockTool({ blockId: "t173-plugin-probe-block" }) as Record<
      string,
      unknown
    >;
    expect(result.source).toBe("plugin");

    resetBlockRegistry();
  });
});

// ---- T-173 AC-002: attrsSchema 语义域随 source 分流 + 类型联合覆盖 plugin 分支形状 ----

describe("T-173 AC-002: source='builtin' 输出 directiveAttrs 的 JSON Schema", () => {
  it("describe_block('qa') 的 attrsSchema 为空 strict object（多数内置块无声明属性）", () => {
    const result = describeBlockTool({ blockId: "qa" }) as Record<string, unknown>;
    expect(result.source).toBe("builtin");
    const schema = result.attrsSchema as Record<string, unknown>;
    expect(schema.type).toBe("object");
    expect(Object.keys(schema.properties as object).length).toBe(0);
    expect(schema.additionalProperties).toBe(false);
  });

  it("describe_block('dialog') 的 attrsSchema 含 speaker/avatar 属性（directiveAttrs 语法域）", () => {
    const result = describeBlockTool({ blockId: "dialog" }) as Record<string, unknown>;
    const schema = result.attrsSchema as Record<string, unknown>;
    const properties = schema.properties as Record<string, unknown>;
    expect(Object.keys(properties)).toEqual(expect.arrayContaining(["speaker", "avatar"]));
  });
});

describe("T-173 AC-002: DescribeBlockResult 类型联合覆盖 plugin 分支形状", () => {
  it("plugin 分支字面量满足 DescribeBlockResult 判别式类型", () => {
    const pluginShape: DescribeBlockResult = {
      id: "x",
      name: "X",
      category: "text",
      source: "plugin",
      attrsSchema: { type: "object", properties: {} },
      directiveBody: "",
      variants: [],
      slots: ["root"],
    };
    expect(pluginShape.source).toBe("plugin");
  });

  it("非法 source 字面量在类型层被拒绝", () => {
    const invalid: DescribeBlockResult = {
      id: "x",
      name: "X",
      category: "text",
      // @ts-expect-error source 只能是 'builtin' | 'plugin'
      source: "unknown",
      attrsSchema: { type: "object", properties: {} },
      directiveBody: "",
      variants: [],
      slots: ["root"],
    };
    expect(invalid).toBeDefined();
  });
});

// ---- T-173 AC-003: directiveBody 输出指令体子结构写法说明 ----

describe("T-173 AC-003: directiveBody 输出指令体子结构写法说明", () => {
  it.each([
    ["dialog", "speaker"],
    ["compare", "ledger"],
    ["steps", "card"],
    ["qa", "问"],
    ["timeline", "日期"],
  ])(
    "describe_block('%s') 的 directiveBody 为含 '%s' 的非空中文写法说明",
    (blockId, expectedSubstring) => {
      const result = describeBlockTool({ blockId }) as Record<string, unknown>;
      const directiveBody = result.directiveBody as string;
      expect(typeof directiveBody).toBe("string");
      expect(directiveBody.length).toBeGreaterThan(0);
      expect(/[一-龥]/.test(directiveBody)).toBe(true);
      expect(directiveBody).toContain(expectedSubstring);
    }
  );

  it("无子结构块（divider）directiveBody 输出空串", () => {
    const result = describeBlockTool({ blockId: "divider" }) as Record<string, unknown>;
    expect(result.directiveBody).toBe("");
  });
});
