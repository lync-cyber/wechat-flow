import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { verifyPenpotTokens } from "../../scripts/design-sync/export-penpot-tokens";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const realTokensPath = `${repoRoot}/docs/design/tokens/penpot-tokens.json`;

function writeTempJson(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), "penpot-tokens-"));
  const path = join(dir, "penpot-tokens.json");
  writeFileSync(path, content);
  return path;
}

describe("verifyPenpotTokens — file missing", () => {
  it("returns ok=false, exists=false, count=0 when the json path does not exist", () => {
    const missingPath = join(tmpdir(), "penpot-tokens-absent-xyz", "penpot-tokens.json");
    const r = verifyPenpotTokens(missingPath);
    expect(r.exists).toBe(false);
    expect(r.count).toBe(0);
    expect(r.tokenKeys).toEqual([]);
    expect(r.ok).toBe(false);
  });
});

describe("verifyPenpotTokens — token count below minimum", () => {
  it("returns ok=false when fewer than minCount --token keys are present", () => {
    const path = writeTempJson(JSON.stringify({ "--color-brand": "#2d5a4e", other: "ignored" }));
    const r = verifyPenpotTokens(path, 60);
    expect(r.exists).toBe(true);
    expect(r.count).toBe(1);
    expect(r.tokenKeys).toEqual(["--color-brand"]);
    expect(r.ok).toBe(false);
  });
});

describe("verifyPenpotTokens — token count meets minimum", () => {
  it("returns ok=true when the real frozen export meets the 60-token gate", () => {
    const r = verifyPenpotTokens(realTokensPath, 60);
    expect(r.exists).toBe(true);
    expect(r.ok).toBe(true);
    expect(r.count).toBeGreaterThanOrEqual(60);
  });

  it("returns ok=true when a fixture exactly meets minCount", () => {
    const tokens: Record<string, string> = {};
    for (let i = 0; i < 3; i++) tokens[`--token-${i}`] = `value-${i}`;
    const path = writeTempJson(JSON.stringify(tokens));
    const r = verifyPenpotTokens(path, 3);
    expect(r.count).toBe(3);
    expect(r.ok).toBe(true);
  });
});

describe("verifyPenpotTokens — corrupted JSON", () => {
  it("returns a structured failure instead of throwing when the file is not valid JSON", () => {
    const path = writeTempJson("{ this is not valid json ");
    expect(() => verifyPenpotTokens(path)).not.toThrow();
    const r = verifyPenpotTokens(path);
    expect(r.exists).toBe(true);
    expect(r.ok).toBe(false);
    expect(r.count).toBe(0);
    expect(r.tokenKeys).toEqual([]);
    expect(r.error).toBeTypeOf("string");
  });
});
