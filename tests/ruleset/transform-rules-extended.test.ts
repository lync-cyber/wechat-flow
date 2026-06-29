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

// ── AC-002 shape checks for new transform rules ──────────────────────────────

describe("T-056 AC-002: new transform rules have required shape fields", () => {
  const newTransformRuleIds = [
    "transform-rem-to-px",
    "transform-em-to-px",
    "transform-vw-to-percent",
    "transform-vh-fallback",
    "transform-hsl-to-rgb",
    "transform-uppercase-hex-lower",
  ];

  it("each new transform rule exports a RuleDefinition with all five required fields", async () => {
    for (const ruleId of newTransformRuleIds) {
      const mod = await import(`../../packages/ruleset/src/rules/builtin/${ruleId}.ts`);
      const rule: RuleDefinition = mod.default;

      expect(typeof rule.id).toBe("string");
      expect(rule.id).toBe(ruleId);
      expect(rule.scope).toBe("transform");
      expect(typeof rule.priority).toBe("number");
      expect(typeof rule.matcher).toBe("function");
      expect(typeof rule.transform).toBe("function");
    }
  });
});

// ── transform-rem-to-px ──────────────────────────────────────────────────────

describe("T-056 AC-005: transform-rem-to-px converts Nrem values to (N*16)px", () => {
  it("converts font-size:1rem to font-size:16px", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-rem-to-px.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "font-size:1rem" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/font-size\s*:\s*16px/);
    expect(style).not.toMatch(/rem/);
  });

  it("converts padding:1.5rem to padding:24px", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-rem-to-px.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "padding:1.5rem;color:red" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).toMatch(/padding\s*:\s*24px/);
    expect(style).toMatch(/color\s*:\s*red/);
  });

  it("converts multiple rem values in the same element", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-rem-to-px.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("section", { style: "font-size:2rem;margin-top:0.5rem" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const section = (result.hast as Root).children[0] as Element;
    const style = section.properties.style as string;

    expect(style).toMatch(/font-size\s*:\s*32px/);
    expect(style).toMatch(/margin-top\s*:\s*8px/);
  });

  it("does not match element with no rem values in style", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-rem-to-px.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "font-size:16px;padding:8px" });
    const matched = (rule as RuleDefinition).matcher(el);

    expect(matched).toBe(false);
  });

  it("leaves style unchanged when style attribute is absent", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-rem-to-px.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { class: "container" });
    const matched = (rule as RuleDefinition).matcher(el);

    expect(matched).toBe(false);
  });
});

// ── transform-em-to-px ───────────────────────────────────────────────────────

describe("T-056 AC-005: transform-em-to-px converts Nem values to (N*16)px", () => {
  it("converts font-size:1em to font-size:16px", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-em-to-px.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "font-size:1em" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/font-size\s*:\s*16px/);
    expect(style).not.toMatch(/\dem\b/);
  });

  it("converts margin:2em to margin:32px", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-em-to-px.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "margin:2em;color:blue" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).toMatch(/margin\s*:\s*32px/);
    expect(style).toMatch(/color\s*:\s*blue/);
  });

  it("converts 0.5em to 8px", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-em-to-px.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("span", { style: "padding-left:0.5em" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const span = (result.hast as Root).children[0] as Element;
    const style = span.properties.style as string;

    expect(style).toMatch(/padding-left\s*:\s*8px/);
  });

  it("does not match element with no em values in style", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-em-to-px.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "font-size:16px" });
    const matched = (rule as RuleDefinition).matcher(el);

    expect(matched).toBe(false);
  });
});

// ── transform-vw-to-percent ──────────────────────────────────────────────────

describe("T-056 AC-005: transform-vw-to-percent converts Nvw to N%", () => {
  it("converts width:100vw to width:100%", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-vw-to-percent.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "width:100vw" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).toMatch(/width\s*:\s*100%/);
    expect(style).not.toMatch(/vw/);
  });

  it("converts max-width:50vw to max-width:50%", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-vw-to-percent.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("section", { style: "max-width:50vw;color:red" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const section = (result.hast as Root).children[0] as Element;
    const style = section.properties.style as string;

    expect(style).toMatch(/max-width\s*:\s*50%/);
    expect(style).toMatch(/color\s*:\s*red/);
  });

  it("converts 33.3vw to 33.3%", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-vw-to-percent.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "width:33.3vw" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).toMatch(/width\s*:\s*33\.3%/);
  });

  it("does not match element with no vw values in style", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-vw-to-percent.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "width:100%;padding:8px" });
    const matched = (rule as RuleDefinition).matcher(el);

    expect(matched).toBe(false);
  });
});

// ── transform-vh-fallback ────────────────────────────────────────────────────

describe("T-056 AC-005: transform-vh-fallback replaces Nvh values with auto", () => {
  it("replaces height:100vh with height:auto", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-vh-fallback.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "height:100vh" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).toMatch(/height\s*:\s*auto/);
    expect(style).not.toMatch(/vh/);
  });

  it("replaces min-height:50vh with min-height:auto, preserves other declarations", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-vh-fallback.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("section", { style: "min-height:50vh;color:black" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const section = (result.hast as Root).children[0] as Element;
    const style = section.properties.style as string;

    expect(style).toMatch(/min-height\s*:\s*auto/);
    expect(style).toMatch(/color\s*:\s*black/);
    expect(style).not.toMatch(/vh/);
  });

  it("does not match element with no vh values in style", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-vh-fallback.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "height:200px" });
    const matched = (rule as RuleDefinition).matcher(el);

    expect(matched).toBe(false);
  });

  it("returns node unchanged when style attribute is absent", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-vh-fallback.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { class: "wrapper" });
    const matched = (rule as RuleDefinition).matcher(el);

    expect(matched).toBe(false);
  });
});

// ── transform-hsl-to-rgb ─────────────────────────────────────────────────────

describe("T-056 AC-005: transform-hsl-to-rgb converts hsl() to rgb() in color and background-color", () => {
  it("converts color:hsl(0,100%,50%) to color:rgb(255, 0, 0)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-hsl-to-rgb.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "color:hsl(0,100%,50%)" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/color\s*:\s*rgb\(\s*255\s*,\s*0\s*,\s*0\s*\)/);
    expect(style).not.toMatch(/hsl/);
  });

  it("converts color:hsl(120,100%,50%) to color:rgb(0, 255, 0)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-hsl-to-rgb.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("span", { style: "color:hsl(120,100%,50%)" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const span = (result.hast as Root).children[0] as Element;
    const style = span.properties.style as string;

    expect(style).toMatch(/color\s*:\s*rgb\(\s*0\s*,\s*255\s*,\s*0\s*\)/);
    expect(style).not.toMatch(/hsl/);
  });

  it("converts background-color:hsl(240,100%,50%) to background-color:rgb(0, 0, 255)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-hsl-to-rgb.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "background-color:hsl(240,100%,50%);font-size:16px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).toMatch(/background-color\s*:\s*rgb\(\s*0\s*,\s*0\s*,\s*255\s*\)/);
    expect(style).toMatch(/font-size\s*:\s*16px/);
    expect(style).not.toMatch(/hsl/);
  });

  it("converts hsl(0,0%,100%) (white) to rgb(255, 255, 255)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-hsl-to-rgb.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "color:hsl(0,0%,100%)" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/color\s*:\s*rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)/);
  });

  it("does not match element whose color/background-color has no hsl()", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-hsl-to-rgb.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "color:rgb(255,0,0);background-color:#fff" });
    const matched = (rule as RuleDefinition).matcher(el);

    expect(matched).toBe(false);
  });

  it("leaves non-color declarations unchanged after hsl conversion", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/transform-hsl-to-rgb.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "color:hsl(60,100%,50%);padding:8px;margin:0" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    // hsl(60,100%,50%) = yellow = rgb(255, 255, 0)
    expect(style).toMatch(/color\s*:\s*rgb\(\s*255\s*,\s*255\s*,\s*0\s*\)/);
    expect(style).toMatch(/padding\s*:\s*8px/);
    expect(style).toMatch(/margin\s*:\s*0/);
  });
});

// ── transform-uppercase-hex-lower ────────────────────────────────────────────

describe("T-056 AC-005: transform-uppercase-hex-lower lowercases #RRGGBB hex color values in style", () => {
  it("converts color:#FF0000 to color:#ff0000", async () => {
    const mod = await import(
      "../../packages/ruleset/src/rules/builtin/transform-uppercase-hex-lower.ts"
    );
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "color:#FF0000" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/color\s*:\s*#ff0000/);
    expect(style).not.toMatch(/#FF0000/);
  });

  it("converts background-color:#AABBCC to background-color:#aabbcc", async () => {
    const mod = await import(
      "../../packages/ruleset/src/rules/builtin/transform-uppercase-hex-lower.ts"
    );
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "background-color:#AABBCC;font-size:14px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).toMatch(/background-color\s*:\s*#aabbcc/);
    expect(style).toMatch(/font-size\s*:\s*14px/);
  });

  it("converts multiple uppercase hex values in same style", async () => {
    const mod = await import(
      "../../packages/ruleset/src/rules/builtin/transform-uppercase-hex-lower.ts"
    );
    const rule: RuleDefinition = mod.default;

    const el = makeElement("section", { style: "color:#FFFFFF;background-color:#000000" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const section = (result.hast as Root).children[0] as Element;
    const style = section.properties.style as string;

    expect(style).toMatch(/color\s*:\s*#ffffff/);
    expect(style).toMatch(/background-color\s*:\s*#000000/);
  });

  it("leaves already-lowercase hex unchanged: color:#abcdef stays color:#abcdef", async () => {
    const mod = await import(
      "../../packages/ruleset/src/rules/builtin/transform-uppercase-hex-lower.ts"
    );
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "color:#abcdef" });
    const hast = makeHast([el]);

    // matcher may or may not fire for already-lowercase; result must be unchanged
    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/color\s*:\s*#abcdef/);
  });

  it("does not match element whose style has no uppercase hex (#RRGGBB) values", async () => {
    const mod = await import(
      "../../packages/ruleset/src/rules/builtin/transform-uppercase-hex-lower.ts"
    );
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "color:#abcdef;padding:4px" });
    const matched = (rule as RuleDefinition).matcher(el);

    expect(matched).toBe(false);
  });

  it("handles #RGB shorthand uppercased: #FFF becomes #fff", async () => {
    const mod = await import(
      "../../packages/ruleset/src/rules/builtin/transform-uppercase-hex-lower.ts"
    );
    const rule: RuleDefinition = mod.default;

    const el = makeElement("span", { style: "color:#FFF" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const span = (result.hast as Root).children[0] as Element;
    const style = span.properties.style as string;

    expect(style).toMatch(/color\s*:\s*#fff/);
  });
});
