import type { Element, Properties, Root } from "hast";
import { describe, expect, it } from "vitest";
import type { RuleDefinition } from "../../packages/ruleset/src/index.ts";
import { applyRuleset } from "../../packages/ruleset/src/index.ts";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeHast(children: Element[]): Root {
  return { type: "root", children };
}

function makeElement(tagName: string, properties: Properties, children: Element[] = []): Element {
  return { type: "element", tagName, properties, children };
}

// ── AC-001: clamp-font-size ──────────────────────────────────────────────────

describe("T-015 AC-001: clamp-font-size clamps font-size to [14px, 32px]", () => {
  it("clamps font-size:8px up to 14px (minimum)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-font-size.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "font-size:8px" }, []);
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/font-size\s*:\s*14px/);
  });

  it("clamps font-size:40px down to 32px (maximum)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-font-size.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "font-size:40px" }, []);
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/font-size\s*:\s*32px/);
  });

  it("leaves font-size:20px unchanged (within range)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-font-size.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "font-size:20px" }, []);
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/font-size\s*:\s*20px/);
  });
});

// ── AC-002: transform-list-to-table ─────────────────────────────────────────

describe("T-015 AC-002: transform-list-to-table converts <ul><li>...</li></ul> to <table> layout", () => {
  it("transforms <ul> with two <li> items into a <table> element", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-list-to-table.ts");
    const rule: RuleDefinition = mod.default;

    const { fromHtml } = await import("hast-util-from-html");
    const { toHtml } = await import("hast-util-to-html");

    const inputHtml = "<ul><li>A</li><li>B</li></ul>";
    const inputHast = fromHtml(inputHtml, { fragment: true }) as unknown as Root;

    const result = applyRuleset(inputHast, [rule]);
    const output = toHtml(result.hast);

    expect(output).toMatch(/<table/i);
    expect(output).not.toMatch(/<ul/i);
  });

  it("preserves li content (text A and B) inside table rows", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-list-to-table.ts");
    const rule: RuleDefinition = mod.default;

    const { fromHtml } = await import("hast-util-from-html");
    const { toHtml } = await import("hast-util-to-html");

    const inputHtml = "<ul><li>A</li><li>B</li></ul>";
    const inputHast = fromHtml(inputHtml, { fragment: true }) as unknown as Root;

    const result = applyRuleset(inputHast, [rule]);
    const output = toHtml(result.hast);

    expect(output).toContain("A");
    expect(output).toContain("B");
    expect(output).toMatch(/<tr/i);
  });
});

// ── AC-003: clamp-rgba-alpha ─────────────────────────────────────────────────

describe("T-015 AC-003: clamp-rgba-alpha clamps alpha < 0.15 up to 0.15", () => {
  it("clamps rgba alpha 0.1 to 0.15", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-rgba-alpha.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "color:rgba(0,0,0,0.1)" }, []);
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/rgba\s*\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.15\s*\)/);
  });

  it("leaves rgba alpha 0.5 unchanged (above minimum)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-rgba-alpha.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "color:rgba(255,0,0,0.5)" }, []);
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/rgba\s*\(\s*255\s*,\s*0\s*,\s*0\s*,\s*0\.5\s*\)/);
  });

  it("clamps rgba alpha 0.0 to 0.15", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-rgba-alpha.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("span", { style: "background:rgba(0,0,0,0)" }, []);
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const span = (result.hast as Root).children[0] as Element;
    const style = span.properties.style as string;

    expect(style).toMatch(/rgba\s*\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.15\s*\)/);
  });
});

// ── AC-004: lint-grid-layout ─────────────────────────────────────────────────

describe("T-015 AC-004: lint-grid-layout produces diagnostic for display:grid elements", () => {
  it("produces a diagnostic with severity error and ruleId lint-grid-layout", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/lint-grid-layout.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "display:grid;grid-template-columns:1fr 1fr" }, []);
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);

    expect(result.report.diagnostics.length).toBeGreaterThanOrEqual(1);
    const diag = result.report.diagnostics.find((d) => d.ruleId === "lint-grid-layout");
    if (!diag) throw new Error("Expected diagnostic with ruleId lint-grid-layout not found");
    expect(diag.severity).toBe("error");
    expect(diag.ruleId).toBe("lint-grid-layout");
  });

  it("does not produce a grid diagnostic for display:block elements", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/lint-grid-layout.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "display:block" }, []);
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);

    const gridDiag = result.report.diagnostics.filter((d) => d.ruleId === "lint-grid-layout");
    expect(gridDiag).toHaveLength(0);
  });
});
