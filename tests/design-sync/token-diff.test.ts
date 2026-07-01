import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseCssTokens, runTokenDiff } from "../../scripts/design-sync/token-diff";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const editorCssPath = `${repoRoot}/apps/editor/src/styles/tokens.css`;
const penpotTokensPath = `${repoRoot}/docs/design/tokens/penpot-tokens.json`;
const matchedFixture = fileURLToPath(new URL("./fixtures/matched-tokens.json", import.meta.url));
const mismatchedFixture = fileURLToPath(
  new URL("./fixtures/mismatched-tokens.json", import.meta.url)
);

describe("parseCssTokens", () => {
  it("extracts --token → value from tokens.css :root block", () => {
    const tokens = parseCssTokens(editorCssPath);
    expect(tokens["--color-brand"]).toBe("#2d5a4e");
    expect(tokens["--color-surface-elevated"]).toBe("#f4f1ec");
    expect(Object.keys(tokens).length).toBeGreaterThanOrEqual(60);
  });
});

describe("runTokenDiff", () => {
  const editorTokens = parseCssTokens(editorCssPath);

  it("reports zero mismatches when every fixture token matches tokens.css (normalized)", () => {
    const result = runTokenDiff(matchedFixture, editorTokens);
    expect(result.mismatches).toEqual([]);
    expect(result.comparedCount).toBeGreaterThan(0);
  });

  it("flags --color-brand when its value diverges from tokens.css", () => {
    const result = runTokenDiff(mismatchedFixture, editorTokens);
    expect(result.mismatches.length).toBeGreaterThanOrEqual(1);
    expect(result.mismatches.map((m) => m.tokenKey)).toContain("--color-brand");
  });

  it("passes the frozen Penpot export against the editor-UI token authority", () => {
    const result = runTokenDiff(penpotTokensPath, editorTokens);
    expect(result.mismatches).toEqual([]);
  });
});
