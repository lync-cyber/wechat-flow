import { createHash } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { hashApiKey } from "../../../apps/mcp-server/src/auth/api-key.ts";
import { getRulesetVersionTool } from "../../../apps/mcp-server/src/tools/get-ruleset-version.ts";
import { lintMarkdownTool } from "../../../apps/mcp-server/src/tools/lint-markdown.ts";
import { renderMarkdownTool } from "../../../apps/mcp-server/src/tools/render-markdown.ts";
import { createServer } from "../../../apps/mcp-server/src/transport/stdio.ts";

// ---- AC-001: render_markdown returns html + four fields ----

describe("AC-001: renderMarkdownTool returns html with heading and required fields", () => {
  it("renders # Hello and returns html containing the heading text with all required fields", async () => {
    const result = await renderMarkdownTool({ markdown: "# Hello", themeId: "default" });
    expect(result).toHaveProperty("html");
    expect(typeof result.html).toBe("string");
    expect(result.html).toMatch(/hello/i);
    expect(result).toHaveProperty("diagnostics");
    expect(Array.isArray(result.diagnostics)).toBe(true);
    expect(result).toHaveProperty("rulesetVersion");
    expect(typeof result.rulesetVersion).toBe("string");
    expect(result).toHaveProperty("themeVersion");
    expect(typeof result.themeVersion).toBe("string");
  });

  it("AC-001 e2e: callTool render_markdown over InMemoryTransport returns non-empty html", async () => {
    const raw = "user-key";
    const apiKeyStore = new Map([[hashApiKey(raw), { scope: "user" as const }]]);
    const server = createServer({ apiKeyStore, rawApiKey: raw });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    const client = new Client({ name: "test-client", version: "0.0.0" });
    await client.connect(clientTransport);

    const res = await client.callTool({
      name: "render_markdown",
      arguments: { markdown: "# Hello", themeId: "default" },
    });
    await client.close();

    const text = (res.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text) as { html: string };
    expect(typeof parsed.html).toBe("string");
    expect(parsed.html.length).toBeGreaterThan(0);
  });
});

// ---- AC-002: deterministic rendering — same input → same sha256 ----

describe("AC-002: renderMarkdownTool is deterministic", () => {
  it("two calls with same markdown + themeId produce identical html sha256", async () => {
    const args = { markdown: "# Hello\n\nWorld paragraph.", themeId: "default" };
    const r1 = await renderMarkdownTool(args);
    const r2 = await renderMarkdownTool(args);

    const hash = (s: string) => createHash("sha256").update(s).digest("hex");
    expect(hash(r1.html as string)).toBe(hash(r2.html as string));
  });
});

// ---- AC-003: get_ruleset_version returns three string fields ----

describe("AC-003: getRulesetVersionTool returns coreVersion + themeVersion + rulesetVersion", () => {
  it("returns all three version fields as non-empty strings", async () => {
    const result = await getRulesetVersionTool({});
    expect(typeof result.coreVersion).toBe("string");
    expect(result.coreVersion.length).toBeGreaterThan(0);
    expect(typeof result.themeVersion).toBe("string");
    expect(typeof result.rulesetVersion).toBe("string");
    expect(result.rulesetVersion.length).toBeGreaterThan(0);
  });

  it("with themeId absent, themeVersion is '0.0.0' (unregistered theme)", async () => {
    const result = await getRulesetVersionTool({});
    expect(result.themeVersion).toBe("0.0.0");
  });
});

// ---- AC-004: lint_markdown position:fixed in customCss → diagnostics, no html ----

describe("AC-004: lintMarkdownTool returns diagnostics only (no html field)", () => {
  it("customCss with position:fixed produces a custom-css-rejected diagnostic and no html key", async () => {
    const result = await lintMarkdownTool({
      markdown: "# Test",
      customCss: "h1 { position: fixed; }",
    });

    // Must not have html field
    expect(result).not.toHaveProperty("html");

    // Must have diagnostics array
    expect(Array.isArray(result.diagnostics)).toBe(true);

    // Must contain the position rejection entry
    const positionDiag = (result.diagnostics as Array<Record<string, unknown>>).find(
      (d) => d.source === "custom-css" || d.ruleId === "custom-css-rejected"
    );
    expect(positionDiag).toBeDefined();
    // severity is 'warning' per custom-css.ts:87 (strip-position is silent; custom-css whitelist rejection is warning)
    expect(positionDiag?.severity).toBe("warning");
  });
});
