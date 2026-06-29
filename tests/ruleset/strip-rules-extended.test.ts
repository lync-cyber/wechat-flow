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

// ── AC-002 shape checks for new strip rules ──────────────────────────────────

describe("T-056 AC-002: new strip rules have required shape fields", () => {
  const newStripRuleIds = [
    "strip-data-attr",
    "strip-aria-hidden",
    "strip-width-height-inline",
    "strip-negative-margin",
    "strip-calc-expression",
  ];

  it("each new strip rule exports a RuleDefinition with all five required fields", async () => {
    for (const ruleId of newStripRuleIds) {
      const mod = await import(`../../packages/ruleset/src/rules/builtin/${ruleId}.ts`);
      const rule: RuleDefinition = mod.default;

      expect(typeof rule.id).toBe("string");
      expect(rule.id).toBe(ruleId);
      expect(rule.scope).toBe("strip");
      expect(typeof rule.priority).toBe("number");
      expect(typeof rule.matcher).toBe("function");
      expect(typeof rule.transform).toBe("function");
    }
  });
});

// ── strip-data-attr ──────────────────────────────────────────────────────────

describe("T-056 AC-003: strip-data-attr removes all data-* attributes", () => {
  it("removes data-id and data-value attributes, preserves class and style", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-data-attr.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", {
      "data-id": "123",
      "data-value": "abc",
      class: "box",
      style: "color:red",
    });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;

    expect(div.properties).not.toHaveProperty("data-id");
    expect(div.properties).not.toHaveProperty("data-value");
    expect(div.properties).toHaveProperty("class", "box");
    expect(div.properties).toHaveProperty("style", "color:red");
  });

  it("does not match an element with no data-* attributes", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-data-attr.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("span", { class: "label", style: "font-size:14px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const span = (result.hast as Root).children[0] as Element;

    expect(span.properties).toHaveProperty("class", "label");
    expect(span.properties).toHaveProperty("style", "font-size:14px");
  });

  it("handles element with only data-* attributes — properties object becomes empty", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-data-attr.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("section", { "data-track": "click", "data-section": "hero" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const section = (result.hast as Root).children[0] as Element;

    expect(Object.keys(section.properties).filter((k) => k.startsWith("data-"))).toHaveLength(0);
  });
});

// ── strip-aria-hidden ────────────────────────────────────────────────────────

describe("T-056 AC-003: strip-aria-hidden removes aria-hidden attribute", () => {
  it("removes aria-hidden attribute and preserves other attributes", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-aria-hidden.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("span", { "aria-hidden": "true", class: "icon", role: "presentation" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const span = (result.hast as Root).children[0] as Element;

    expect(span.properties).not.toHaveProperty("aria-hidden");
    expect(span.properties).toHaveProperty("class", "icon");
    expect(span.properties).toHaveProperty("role", "presentation");
  });

  it("does not match an element without aria-hidden", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-aria-hidden.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { class: "container", style: "display:block" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;

    expect(div.properties).toHaveProperty("class", "container");
    expect(div.properties).toHaveProperty("style", "display:block");
  });

  it("removes aria-hidden=false as well (attribute presence triggers rule regardless of value)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-aria-hidden.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("button", { "aria-hidden": "false", type: "button" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const btn = (result.hast as Root).children[0] as Element;

    expect(btn.properties).not.toHaveProperty("aria-hidden");
    expect(btn.properties).toHaveProperty("type", "button");
  });
});

// ── strip-width-height-inline ────────────────────────────────────────────────

describe("T-056 AC-003: strip-width-height-inline removes width and height from style", () => {
  it("removes width and height declarations, preserves color and font-size", async () => {
    const mod = await import(
      "../../packages/ruleset/src/rules/builtin/strip-width-height-inline.ts"
    );
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "width:200px;height:100px;color:red;font-size:16px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).not.toMatch(/width\s*:/);
    expect(style).not.toMatch(/height\s*:/);
    expect(style).toMatch(/color\s*:\s*red/);
    expect(style).toMatch(/font-size\s*:\s*16px/);
  });

  it("removes only width when height is absent", async () => {
    const mod = await import(
      "../../packages/ruleset/src/rules/builtin/strip-width-height-inline.ts"
    );
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "width:100%;margin:0" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).not.toMatch(/width\s*:/);
    expect(style).toMatch(/margin\s*:\s*0/);
  });

  it("does not match an element without width or height in style", async () => {
    const mod = await import(
      "../../packages/ruleset/src/rules/builtin/strip-width-height-inline.ts"
    );
    const rule: RuleDefinition = mod.default;

    const el = makeElement("span", { style: "color:blue;padding:4px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const span = (result.hast as Root).children[0] as Element;
    const style = span.properties.style as string;

    expect(style).toMatch(/color\s*:\s*blue/);
    expect(style).toMatch(/padding\s*:\s*4px/);
  });

  it("returns node unchanged when style attribute is absent", async () => {
    const mod = await import(
      "../../packages/ruleset/src/rules/builtin/strip-width-height-inline.ts"
    );
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { class: "box" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;

    expect(div.properties).toHaveProperty("class", "box");
    expect(div.properties).not.toHaveProperty("style");
  });
});

// ── strip-negative-margin ────────────────────────────────────────────────────

describe("T-056 AC-003: strip-negative-margin removes negative margin declarations", () => {
  it("removes margin-top:-10px, preserves color and positive margin-bottom", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-negative-margin.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "margin-top:-10px;margin-bottom:8px;color:red" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).not.toMatch(/margin-top\s*:\s*-10px/);
    expect(style).toMatch(/margin-bottom\s*:\s*8px/);
    expect(style).toMatch(/color\s*:\s*red/);
  });

  it("removes margin:-5px (shorthand negative value)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-negative-margin.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "margin:-5px;font-size:16px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).not.toMatch(/margin\s*:\s*-5px/);
    expect(style).toMatch(/font-size\s*:\s*16px/);
  });

  it("preserves positive margin values and does not match elements without negative margins", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-negative-margin.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "margin-top:10px;margin-left:20px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).toMatch(/margin-top\s*:\s*10px/);
    expect(style).toMatch(/margin-left\s*:\s*20px/);
  });

  it("does not strip margin-left:-2rem when it is negative (removes it)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-negative-margin.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("span", { style: "margin-left:-2rem;padding:4px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const span = (result.hast as Root).children[0] as Element;
    const style = span.properties.style as string;

    expect(style).not.toMatch(/margin-left\s*:/);
    expect(style).toMatch(/padding\s*:\s*4px/);
  });
});

// ── strip-calc-expression ────────────────────────────────────────────────────

describe("T-056 AC-003: strip-calc-expression removes CSS declarations containing calc(", () => {
  it("removes width:calc(100% - 20px), preserves color", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-calc-expression.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "width:calc(100% - 20px);color:blue" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).not.toMatch(/width\s*:/);
    expect(style).toMatch(/color\s*:\s*blue/);
  });

  it("removes multiple calc declarations, preserves non-calc declarations", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-calc-expression.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("section", {
      style: "height:calc(50vh - 8px);padding:calc(4px + 1em);font-size:14px",
    });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const section = (result.hast as Root).children[0] as Element;
    const style = section.properties.style as string;

    expect(style).not.toMatch(/height\s*:/);
    expect(style).not.toMatch(/padding\s*:/);
    expect(style).toMatch(/font-size\s*:\s*14px/);
  });

  it("does not match an element whose style has no calc() values", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-calc-expression.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "width:100%;font-size:16px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/width\s*:\s*100%/);
    expect(style).toMatch(/font-size\s*:\s*16px/);
  });

  it("returns node unchanged when style attribute is absent", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-calc-expression.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { id: "no-style" });
    const hast = makeHast([el]);

    // strip-calc-expression matcher should not fire (no style)
    const matched = (mod.default as RuleDefinition).matcher(el);
    expect(matched).toBe(false);
  });
});
