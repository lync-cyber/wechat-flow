import { describe, expect, it } from "vitest";
import { composeRender } from "../../apps/editor/src/use-cases/render.ts";

describe("AC-001: composeRender returns RenderResult with html and diagnostics", () => {
  it("returns non-empty html string for heading input", async () => {
    const result = await composeRender({ markdown: "# Hello", themeId: "default" });
    expect(typeof result.html).toBe("string");
    expect(result.html.length).toBeGreaterThan(0);
  });

  it("returns diagnostics as an array", async () => {
    const result = await composeRender({ markdown: "# Hello", themeId: "default" });
    expect(Array.isArray(result.diagnostics)).toBe(true);
  });
});

describe("AC-003: composeRender result contains versionTriple", () => {
  it("result.versionTriple is an object with coreVersion, themeVersion, rulesetVersion", async () => {
    const result = await composeRender({ markdown: "# Hello", themeId: "default" });
    expect(result.versionTriple).toBeDefined();
    expect(typeof result.versionTriple.coreVersion).toBe("string");
    expect(typeof result.versionTriple.themeVersion).toBe("string");
    expect(typeof result.versionTriple.rulesetVersion).toBe("string");
  });

  it("versionTriple.rulesetVersion is '0.0.0' for Sprint 1 skeleton", async () => {
    const result = await composeRender({ markdown: "# Hello", themeId: "default" });
    expect(result.versionTriple.rulesetVersion).toBe("0.0.0");
  });

  it("versionTriple.coreVersion is a valid semver string", async () => {
    const result = await composeRender({ markdown: "# Hello", themeId: "default" });
    expect(result.versionTriple.coreVersion).toMatch(/^\d+\.\d+\.\d+/);
  });
});
