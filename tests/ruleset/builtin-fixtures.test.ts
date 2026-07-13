import { readFile, readdir, stat } from "node:fs/promises";
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

const BUILTIN_DIR = join(import.meta.dirname, "../../packages/ruleset/src/rules/builtin");
const NON_RULE_FILES = new Set(["index.ts", "css-helpers.ts"]);

async function loadBuiltinRuleIds(): Promise<string[]> {
  const entries = await readdir(BUILTIN_DIR, { withFileTypes: true });
  return entries
    .filter(
      (e) =>
        e.isFile() &&
        e.name.endsWith(".ts") &&
        !e.name.endsWith(".test.ts") &&
        !NON_RULE_FILES.has(e.name)
    )
    .map((e) => e.name.replace(/\.ts$/, ""))
    .sort();
}

async function dirExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function normalizeHtml(html: string): Promise<string> {
  const { fromHtml } = await import("hast-util-from-html");
  const { toHtml } = await import("hast-util-to-html");
  const hast = fromHtml(html.trim(), { fragment: true });
  return toHtml(hast).trim();
}

// ── fixture runner ────────────────────────────────────────────────────────────

describe("T-014 AC-005 + T-015 AC-005 + SR-003: builtin fixture suite (all 41 rules)", async () => {
  const ruleIds = await loadBuiltinRuleIds().catch(() => [] as string[]);

  if (ruleIds.length === 0) {
    it("builtin rule files exist under packages/ruleset/src/rules/builtin/", () => {
      expect(ruleIds.length).toBeGreaterThan(0);
    });
    return;
  }

  for (const ruleId of ruleIds) {
    const fixtureDir = join(BUILTIN_DIR, ruleId);

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
            const match = result.diagnostics.find(
              (d) => d.ruleId === expected.ruleId && d.severity === expected.severity
            );
            expect(match).toBeDefined();
          }
        }
      } else {
        // non-lint rules: compare HTML output
        const actualHtml = toHtml(result.hast).trim();
        if (process.env.UPDATE_FIXTURES) {
          const { writeFile } = await import("node:fs/promises");
          await writeFile(join(fixtureDir, "expected.html"), `${actualHtml}\n`, "utf-8");
          return;
        }
        const normalizedExpected = await normalizeHtml(expectedHtml);
        expect(actualHtml).toBe(normalizedExpected);
      }
    });
  }
});

// ── drift guard ───────────────────────────────────────────────────────────────
// arch#§2.M-003: every registered builtin rule must ship a fixture directory
// co-located with its definition, with a complete three-piece set and metadata
// that matches the rule it documents.

describe("SR-003: fixture drift guard — every builtin rule has a complete co-located fixture", async () => {
  const ruleIds = await loadBuiltinRuleIds().catch(() => [] as string[]);

  it("discovers at least 41 builtin rules", () => {
    expect(ruleIds.length).toBeGreaterThanOrEqual(41);
  });

  for (const ruleId of ruleIds) {
    describe(`rule[${ruleId}]`, () => {
      const fixtureDir = join(BUILTIN_DIR, ruleId);

      it("has a fixture directory co-located under rules/builtin/{rule-id}/", async () => {
        expect(await dirExists(fixtureDir)).toBe(true);
      });

      it("has input.html, expected.html, and metadata.json", async () => {
        for (const file of ["input.html", "expected.html", "metadata.json"]) {
          await expect(readFile(join(fixtureDir, file), "utf-8")).resolves.not.toHaveLength(0);
        }
      });

      it("declares a fixture field on RuleDefinition referencing rules/builtin/{rule-id}", async () => {
        const mod = await import(`${BUILTIN_DIR}/${ruleId}.ts`);
        const rule: RuleDefinition = mod.default;
        expect(rule.fixture).toBe(`rules/builtin/${ruleId}`);
      });

      it("metadata.json has ruleId matching the fixture directory name and required schema fields", async () => {
        const metadataRaw = await readFile(join(fixtureDir, "metadata.json"), "utf-8");
        const metadata: FixtureMetadata = JSON.parse(metadataRaw);

        expect(metadata.ruleId).toBe(ruleId);
        expect(typeof metadata.scope).toBe("string");
        expect(typeof metadata.priority).toBe("number");
        expect(typeof metadata.description).toBe("string");
        expect(metadata.description.length).toBeGreaterThan(0);
        expect(metadata.wechatVersion).toBeDefined();
        expect(typeof metadata.wechatVersion?.minSupported).toBe("string");
        expect(Array.isArray(metadata.wechatVersion?.knownBuggy)).toBe(true);
      });
    });
  }
});
