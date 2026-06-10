import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Root } from "hast";
import { describe, expect, it } from "vitest";
import type { RuleDefinition } from "../../packages/ruleset/src/index.ts";
import { applyRuleset } from "../../packages/ruleset/src/index.ts";

// ── types ─────────────────────────────────────────────────────────────────────

interface FixtureMetadata {
  ruleId: string;
  scope: string;
  priority: number;
  description: string;
  expectedDiagnostics?: Array<{ severity: string; ruleId: string }>;
  wechatVersion?: { minSupported: string; knownBuggy: string[] };
}

// ── helpers ───────────────────────────────────────────────────────────────────

const FIXTURES_DIR = join(import.meta.dirname, "../ruleset-fixtures");
const BUILTIN_DIR = join(import.meta.dirname, "../../packages/ruleset/src/rules/builtin");

async function loadFixtureDirs(): Promise<string[]> {
  const entries = await readdir(FIXTURES_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function normalizeHtml(html: string): Promise<string> {
  const { fromHtml } = await import("hast-util-from-html");
  const { toHtml } = await import("hast-util-to-html");
  const hast = fromHtml(html.trim(), { fragment: true });
  return toHtml(hast).trim();
}

// ── fixture runner ────────────────────────────────────────────────────────────

describe("T-014 AC-005 + T-015 AC-005: builtin fixture suite (all scopes)", async () => {
  const fixtureDirs = await loadFixtureDirs().catch(() => [] as string[]);

  if (fixtureDirs.length === 0) {
    it("fixture directories exist under tests/ruleset-fixtures/", () => {
      expect(fixtureDirs.length).toBeGreaterThan(0);
    });
    return;
  }

  for (const ruleId of fixtureDirs) {
    const fixtureDir = join(FIXTURES_DIR, ruleId);

    it(`fixture[${ruleId}]: applies rule and output matches expected.html`, async () => {
      const metadataRaw = await readFile(join(fixtureDir, "metadata.json"), "utf-8");
      const metadata: FixtureMetadata = JSON.parse(metadataRaw);

      const inputHtml = await readFile(join(fixtureDir, "input.html"), "utf-8");
      const expectedHtml = await readFile(join(fixtureDir, "expected.html"), "utf-8");

      const { fromHtml } = await import("hast-util-from-html");
      const { toHtml } = await import("hast-util-to-html");

      const inputHast = fromHtml(inputHtml.trim(), { fragment: true }) as unknown as Root;

      const ruleModPath = `${BUILTIN_DIR}/${ruleId}.ts`;
      const mod = await import(ruleModPath);
      const rule: RuleDefinition = mod.default;

      expect(rule.id).toBe(metadata.ruleId);
      expect(rule.scope).toBe(metadata.scope);

      const result = applyRuleset(inputHast, [rule]);

      if (metadata.scope === "lint") {
        // lint rules: HTML unchanged, assert diagnostics
        const actualHtml = toHtml(result.hast).trim();
        const normalizedInput = await normalizeHtml(inputHtml);
        expect(actualHtml).toBe(normalizedInput);

        if (metadata.expectedDiagnostics && metadata.expectedDiagnostics.length > 0) {
          for (const expected of metadata.expectedDiagnostics) {
            const match = result.report.diagnostics.find(
              (d) => d.ruleId === expected.ruleId && d.severity === expected.severity
            );
            expect(match).toBeDefined();
          }
        }
      } else {
        // non-lint rules: compare HTML output
        const actualHtml = toHtml(result.hast).trim();
        const normalizedExpected = await normalizeHtml(expectedHtml);
        expect(actualHtml).toBe(normalizedExpected);
      }
    });
  }
});
