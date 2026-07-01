import { describe, expect, it } from "vitest";
import corePkg from "../../../packages/core/package.json" with { type: "json" };
import { getVersionTriple } from "../../../packages/core/src/version/triple.ts";
import rulesetPkg from "../../../packages/ruleset/package.json" with { type: "json" };

describe("AC-001: getVersionTriple returns three string fields in semver shape", () => {
  it("returns coreVersion/themeVersion/rulesetVersion as strings", () => {
    const triple = getVersionTriple();
    expect(typeof triple.coreVersion).toBe("string");
    expect(typeof triple.themeVersion).toBe("string");
    expect(typeof triple.rulesetVersion).toBe("string");
  });

  it("coreVersion and rulesetVersion match semver shape", () => {
    const triple = getVersionTriple();
    expect(triple.coreVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(triple.rulesetVersion).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe("AC-002: getVersionTriple values trace to real package versions", () => {
  it("coreVersion equals packages/core package.json version", () => {
    expect(getVersionTriple().coreVersion).toBe(corePkg.version);
  });

  it("rulesetVersion equals packages/ruleset package.json version", () => {
    expect(getVersionTriple().rulesetVersion).toBe(rulesetPkg.version);
  });

  it("injected themeVersion is reflected verbatim", () => {
    expect(getVersionTriple("1.2.3").themeVersion).toBe("1.2.3");
  });

  it("defaults themeVersion to '0.0.0' when not provided", () => {
    expect(getVersionTriple().themeVersion).toBe("0.0.0");
  });
});
