import { describe, expect, it } from "vitest";
import { derivePalette } from "../../packages/palette/src/index.ts";
import { wcagContrast } from "../../packages/palette/src/wcag/contrast-validator.ts";

describe("AC-001: derivePalette returns TokenDictionary with ≥ 20 token fields", () => {
  it("contains --color-brand from primary seed", () => {
    const dict = derivePalette({ primary: "#a8322a" });
    expect(dict["--color-brand"]).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("contains --color-surface", () => {
    const dict = derivePalette({ primary: "#a8322a" });
    expect(dict["--color-surface"]).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("contains --color-text-primary", () => {
    const dict = derivePalette({ primary: "#a8322a" });
    expect(dict["--color-text-primary"]).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("contains --color-accent", () => {
    const dict = derivePalette({ primary: "#a8322a" });
    expect(dict["--color-accent"]).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("returns at least 20 token fields", () => {
    const dict = derivePalette({ primary: "#a8322a" });
    const tokenCount = Object.keys(dict).length;
    expect(tokenCount).toBeGreaterThanOrEqual(20);
  });

  it("all token values are valid hex colors", () => {
    const dict = derivePalette({ primary: "#a8322a" });
    for (const [, value] of Object.entries(dict)) {
      expect(value).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("AC-002: --color-text-primary on --color-surface meets WCAG AA (≥ 4.5:1)", () => {
  it("contrast ratio of text-primary on surface is ≥ 4.5 for red primary", () => {
    const dict = derivePalette({ primary: "#a8322a" });
    const ratio = wcagContrast(dict["--color-text-primary"], dict["--color-surface"]);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

describe("AC-003: derivePalette with near-white primary auto-adjusts text contrast to ≥ 4.5:1", () => {
  it("contrast ratio of text-primary on surface is ≥ 4.5 for white primary", () => {
    const dict = derivePalette({ primary: "#fff" });
    const ratio = wcagContrast(dict["--color-text-primary"], dict["--color-surface"]);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("returns a valid TokenDictionary with ≥ 20 tokens for white primary", () => {
    const dict = derivePalette({ primary: "#fff" });
    expect(Object.keys(dict).length).toBeGreaterThanOrEqual(20);
  });
});
