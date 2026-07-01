import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeAll, describe, expect, it } from "vitest";
import { hashApiKey } from "../../apps/mcp-server/src/auth/api-key.ts";
import type { JobsClient } from "../../apps/mcp-server/src/jobs/client.ts";
import { createServer } from "../../apps/mcp-server/src/transport/stdio.ts";

// ---- helpers ----

const RAW_KEY = "skill-test-user-key";

function makeJobsClientMock(): JobsClient {
  const completedJobs = new Map<string, { url: string }>();
  return {
    async enqueue(_kind, _payload, _opts) {
      const jobId = `mock-job-${Math.random().toString(36).slice(2)}`;
      // immediately mark as succeeded with a fake URL
      completedJobs.set(jobId, { url: "https://mmbiz.qpic.cn/mock-image.jpg" });
      return { jobId };
    },
    async getJob(jobId) {
      const result = completedJobs.get(jobId);
      if (result) return { status: "succeeded", result };
      return { status: "failed", error: "E_NOT_FOUND" };
    },
  };
}

async function makeClient() {
  const apiKeyStore = new Map([[hashApiKey(RAW_KEY), { scope: "user" as const }]]);
  const server = createServer({
    apiKeyStore,
    rawApiKey: RAW_KEY,
    jobsClient: makeJobsClientMock(),
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "skill-test-client", version: "0.0.0" });
  await client.connect(clientTransport);
  return client;
}

function callTool<T>(client: Client, name: string, args: Record<string, unknown> = {}): Promise<T> {
  return client.callTool({ name, arguments: args }).then((res) => {
    const text = (res.content as Array<{ type: string; text: string }>)[0].text;
    return JSON.parse(text) as T;
  });
}

// ---- AC-004: version alignment ----

describe("AC-004: skill/package.json version aligns with @wechat-flow/mcp-server", () => {
  it("both package.json files share the same version string", () => {
    const root = resolve(import.meta.dirname, "../..");
    const skillPkg = JSON.parse(readFileSync(resolve(root, "skill/package.json"), "utf-8")) as {
      version: string;
    };
    const mcpPkg = JSON.parse(
      readFileSync(resolve(root, "apps/mcp-server/package.json"), "utf-8")
    ) as { version: string };
    expect(skillPkg.version).toBe(mcpPkg.version);
  });
});

// ---- AC-002/003: bundle structure sanity (mechanical floor) ----

describe("AC-002: skill/prompts contains ≥3 prompt fragments", () => {
  it("recommend-theme.md exists and is non-empty", () => {
    const root = resolve(import.meta.dirname, "../..");
    const content = readFileSync(resolve(root, "skill/prompts/recommend-theme.md"), "utf-8");
    expect(content.trim().length).toBeGreaterThan(0);
    expect(content).toContain("list_themes");
  });
  it("choose-variant.md exists and is non-empty", () => {
    const root = resolve(import.meta.dirname, "../..");
    const content = readFileSync(resolve(root, "skill/prompts/choose-variant.md"), "utf-8");
    expect(content.trim().length).toBeGreaterThan(0);
    expect(content).toContain("list_block_variants");
  });
  it("build-callout.md exists and is non-empty", () => {
    const root = resolve(import.meta.dirname, "../..");
    const content = readFileSync(resolve(root, "skill/prompts/build-callout.md"), "utf-8");
    expect(content.trim().length).toBeGreaterThan(0);
    expect(content).toContain("callout");
  });
});

describe("AC-003: skill/resources contains ≥2 sample Markdowns with real theme ids", () => {
  it("sample-tech-review.md uses theme: tech and contains directive", () => {
    const root = resolve(import.meta.dirname, "../..");
    const content = readFileSync(resolve(root, "skill/resources/sample-tech-review.md"), "utf-8");
    expect(content).toContain("theme: tech");
    expect(content).toContain(":::");
  });
  it("sample-poetry-essay.md uses theme: literary and contains directive", () => {
    const root = resolve(import.meta.dirname, "../..");
    const content = readFileSync(resolve(root, "skill/resources/sample-poetry-essay.md"), "utf-8");
    expect(content).toContain("theme: literary");
    expect(content).toContain(":::");
  });
});

// ---- AC-001: SKILL.md describes the orchestration workflow ----

describe("AC-001: SKILL.md describes tool call order and semantic tasks", () => {
  it("SKILL.md contains all 6 canonical orchestration chain steps", () => {
    const root = resolve(import.meta.dirname, "../..");
    const content = readFileSync(resolve(root, "skill/SKILL.md"), "utf-8");
    expect(content).toContain("list_themes");
    expect(content).toContain("describe_theme");
    expect(content).toContain("describe_template");
    expect(content).toContain("render_markdown");
    expect(content).toContain("simulate_paste");
    expect(content).toContain("upload_to_wechat_asset");
  });
  it("SKILL.md includes register_variant in the workflow", () => {
    const root = resolve(import.meta.dirname, "../..");
    const content = readFileSync(resolve(root, "skill/SKILL.md"), "utf-8");
    expect(content).toContain("register_variant");
  });
  it("SKILL.md explains get_job polling for async tools", () => {
    const root = resolve(import.meta.dirname, "../..");
    const content = readFileSync(resolve(root, "skill/SKILL.md"), "utf-8");
    expect(content).toContain("get_job");
  });
});

// ---- AC-005: end-to-end orchestration chain via real MCP dispatch ----

describe("AC-005: orchestration chain — real tool handlers, mocked external deps", () => {
  let client: Client;

  beforeAll(async () => {
    client = await makeClient();
  });

  it("Step 1 — list_themes returns an array containing the 5 built-in themes", async () => {
    const result = await callTool<Array<{ id: string; name: string }>>(client, "list_themes");
    expect(Array.isArray(result)).toBe(true);
    const ids = result.map((t) => t.id);
    expect(ids).toContain("default");
    expect(ids).toContain("tech");
    expect(ids).toContain("literary");
    expect(ids).toContain("business");
    expect(ids).toContain("magazine");
  });

  it("Step 2 — describe_theme(default) returns id, name, and templates array", async () => {
    const result = await callTool<{
      id: string;
      name: string;
      paintable: unknown;
      templates: Array<{ id: string }>;
    }>(client, "describe_theme", { id: "default" });
    expect(result.id).toBe("default");
    expect(typeof result.name).toBe("string");
    expect(result.name.length).toBeGreaterThan(0);
    expect(Array.isArray(result.templates)).toBe(true);
  });

  it("Step 3 — describe_template(default, starter) returns non-empty markdown", async () => {
    const result = await callTool<{
      themeId: string;
      templateId: string;
      markdown: string;
      coveredElements: string[];
      coveredBlocks: string[];
    }>(client, "describe_template", { themeId: "default", templateId: "starter" });
    expect(result.themeId).toBe("default");
    expect(result.templateId).toBe("starter");
    expect(typeof result.markdown).toBe("string");
    expect(result.markdown.trim().length).toBeGreaterThan(0);
    expect(Array.isArray(result.coveredElements)).toBe(true);
  });

  it("Step 3b — register_variant(callout, skill-card) returns registered=true", async () => {
    const result = await callTool<{
      registered: boolean;
      variantId: string;
      rejectedDeclarations: unknown[];
    }>(client, "register_variant", {
      blockId: "callout",
      variantId: "skill-card",
      label: "Skill Card",
      style: {
        root: {
          "background-color": "#f0f9ff",
          "border-left": "4px solid #0ea5e9",
          padding: "12px 16px",
        },
      },
    });
    expect(result.registered).toBe(true);
    expect(result.variantId).toBe("skill-card");
    expect(Array.isArray(result.rejectedDeclarations)).toBe(true);
  });

  it("Step 4 — render_markdown with tech theme returns html and diagnostics", async () => {
    const markdown = `# Hello\n\n这是一段测试内容。\n\n::: callout{type="info"}\n测试 callout。\n:::`;
    const result = await callTool<{
      html: string;
      diagnostics: unknown[];
      rulesetVersion: string;
      themeVersion: string;
      postPaste: boolean;
    }>(client, "render_markdown", { markdown, themeId: "tech" });
    expect(typeof result.html).toBe("string");
    expect(result.html.length).toBeGreaterThan(0);
    expect(result.html).toContain("Hello");
    expect(Array.isArray(result.diagnostics)).toBe(true);
    expect(typeof result.rulesetVersion).toBe("string");
    expect(typeof result.postPaste).toBe("boolean");
  });

  it("Step 5 — simulate_paste returns filteredHtml with diffNodes and droppedAttrs", async () => {
    const html = '<p style="font-family: Arial; color: red;">内容</p>';
    const result = await callTool<{
      filteredHtml: string;
      diffNodes: unknown[];
      droppedAttrs: Record<string, string[]>;
    }>(client, "simulate_paste", { html });
    expect(typeof result.filteredHtml).toBe("string");
    expect(result.filteredHtml.length).toBeGreaterThan(0);
    expect(Array.isArray(result.diffNodes)).toBe(true);
    expect(typeof result.droppedAttrs).toBe("object");
  });

  it("Step 6a — upload_to_wechat_asset returns jobId (async, mocked)", async () => {
    const result = await callTool<{ jobId: string }>(client, "upload_to_wechat_asset", {
      imageUrl: "https://example.com/image.jpg",
      type: "image",
    });
    expect(typeof result.jobId).toBe("string");
    expect(result.jobId.length).toBeGreaterThan(0);
  });

  it("Step 6b — get_job(jobId) returns status=succeeded with result url", async () => {
    // First enqueue a job via upload_to_wechat_asset
    const uploadResult = await callTool<{ jobId: string }>(client, "upload_to_wechat_asset", {
      imageUrl: "https://example.com/image2.jpg",
      type: "image",
    });
    const jobId = uploadResult.jobId;
    expect(typeof jobId).toBe("string");

    // Then poll for completion
    const jobResult = await callTool<{
      status: string;
      result?: { url: string };
    }>(client, "get_job", { jobId });
    expect(jobResult.status).toBe("succeeded");
    expect(typeof jobResult.result?.url).toBe("string");
    expect(jobResult.result?.url.length).toBeGreaterThan(0);
  });

  it("Full chain — no error code at any step", async () => {
    const markdown = "# 微信公众号测试\n\n这是一段完整链路测试内容。";

    const themes = await callTool<Array<{ id: string; name: string }>>(client, "list_themes");
    expect((themes as { code?: string }).code).toBeUndefined();

    const theme = await callTool<{ id: string; code?: string }>(client, "describe_theme", {
      id: "default",
    });
    expect(theme.code).toBeUndefined();

    const template = await callTool<{ markdown: string; code?: string }>(
      client,
      "describe_template",
      { themeId: "default", templateId: "starter" }
    );
    expect(template.code).toBeUndefined();

    const rendered = await callTool<{ html: string; code?: string }>(client, "render_markdown", {
      markdown,
      themeId: "default",
    });
    expect(rendered.code).toBeUndefined();
    expect(rendered.html.length).toBeGreaterThan(0);

    const pasted = await callTool<{ filteredHtml: string; code?: string }>(
      client,
      "simulate_paste",
      { html: rendered.html }
    );
    expect(pasted.code).toBeUndefined();
    expect(pasted.filteredHtml.length).toBeGreaterThan(0);

    const uploaded = await callTool<{ jobId?: string; code?: string }>(
      client,
      "upload_to_wechat_asset",
      { imageUrl: "https://example.com/final.jpg", type: "image" }
    );
    expect(uploaded.code).toBeUndefined();
    expect(typeof uploaded.jobId).toBe("string");
  });
});
