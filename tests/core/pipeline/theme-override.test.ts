import { describe, expect, it } from "vitest";
import type { ThemeDefinition } from "../../../packages/contracts/src/theme/theme-definition.ts";
import {
  applyBaseColorToBlocks,
  applyPaintToBlocks,
} from "../../../packages/core/src/pipeline/theme-override.ts";

describe("applyPaintToBlocks — branch coverage", () => {
  it("returns original blocks when no paint tokens pass the paintable whitelist", () => {
    const theme = {
      id: "t1",
      name: "T1",
      tokens: { "--color-brand": "#0000ff" },
      blocks: { h1: { default: { color: "#0000ff" } } },
      paintable: [],
    } satisfies Partial<ThemeDefinition> as ThemeDefinition;

    const { blocks, warnDiagnostics } = applyPaintToBlocks(theme, {
      "--color-brand": "#ff0000",
    });

    expect(blocks).toEqual(theme.blocks);
    const warn = warnDiagnostics.find((d) => d.ruleId === "paint-token-not-paintable");
    expect(warn).toBeDefined();
    expect(warn?.severity).toBe("warning");
  });

  it("returns original blocks when theme has no blocks", () => {
    const theme = {
      id: "t2",
      name: "T2",
      tokens: { "--color-brand": "#0000ff" },
      paintable: ["--color-brand"],
    } satisfies Partial<ThemeDefinition> as ThemeDefinition;

    const { blocks, warnDiagnostics } = applyPaintToBlocks(theme, {
      "--color-brand": "#ff0000",
    });

    expect(blocks).toBeUndefined();
    expect(warnDiagnostics).toHaveLength(0);
  });

  it("returns original blocks when token value is not in theme.tokens (undefined originalTokenValue)", () => {
    const theme = {
      id: "t3",
      name: "T3",
      tokens: {},
      blocks: { h1: { default: { color: "#aabbcc" } } },
      paintable: ["--color-accent"],
    } satisfies Partial<ThemeDefinition> as ThemeDefinition;

    const { blocks, warnDiagnostics } = applyPaintToBlocks(theme, {
      "--color-accent": "#112233",
    });

    expect(blocks).toEqual(theme.blocks);
    expect(warnDiagnostics).toHaveLength(0);
  });

  it("paintable is not an array — treats paintable set as empty, warns for all paint tokens", () => {
    const theme = {
      id: "t4",
      name: "T4",
      tokens: { "--color-brand": "#003366" },
      blocks: { h1: { default: { color: "#003366" } } },
      paintable: undefined,
    } satisfies Partial<ThemeDefinition> as ThemeDefinition;

    const { blocks, warnDiagnostics } = applyPaintToBlocks(theme, {
      "--color-brand": "#aabbcc",
    });

    expect(blocks).toEqual(theme.blocks);
    const warn = warnDiagnostics.find((d) => d.ruleId === "paint-token-not-paintable");
    expect(warn).toBeDefined();
  });
});

describe("applyBaseColorToBlocks — branch coverage", () => {
  it("returns undefined when theme has no blocks", () => {
    const theme = {
      id: "t5",
      name: "T5",
      tokens: { primary: "#0055aa" },
    } satisfies Partial<ThemeDefinition> as ThemeDefinition;

    const result = applyBaseColorToBlocks(theme, "#ff0000");
    expect(result).toBeUndefined();
  });

  it("returns original blocks when no derived palette values differ from existing tokens", () => {
    const theme = {
      id: "t6",
      name: "T6",
      tokens: {},
      blocks: { h1: { default: { color: "#aabbcc" } } },
    } satisfies Partial<ThemeDefinition> as ThemeDefinition;

    const result = applyBaseColorToBlocks(theme, "#0055aa");

    expect(result).toEqual(theme.blocks);
  });
});
