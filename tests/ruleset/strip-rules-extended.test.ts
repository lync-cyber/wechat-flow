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

// Route input through the production parser so hast property keys are camelCased by
// property-information (aria-hidden → ariaHidden, data-foo → dataFoo) exactly as they are
// in the real pipeline. Attribute-name rules must be exercised against parsed HTML, never
// hand-built kebab-case hast nodes — the latter bypass normalization and mask no-op matchers.
async function runRule(ruleId: string, inputHtml: string): Promise<string> {
  const { fromHtml } = await import("hast-util-from-html");
  const { toHtml } = await import("hast-util-to-html");
  const mod = await import(`../../packages/ruleset/src/rules/builtin/${ruleId}.ts`);
  const rule: RuleDefinition = mod.default;
  const hast = fromHtml(inputHtml, { fragment: true }) as unknown as Root;
  const result = applyRuleset(hast, [rule]);
  return toHtml(result.hast).trim();
}

// ── AC-002 shape checks for new strip rules ──────────────────────────────────

describe("T-056 AC-002: new strip rules have required shape fields", () => {
  const newStripRuleIds = [
    "strip-data-attr",
    "strip-aria-hidden",
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
    const out = await runRule(
      "strip-data-attr",
      `<div data-id="123" data-value="abc" class="box" style="color:red">Box</div>`
    );

    expect(out).not.toContain("data-id");
    expect(out).not.toContain("data-value");
    expect(out).toContain(`class="box"`);
    expect(out).toContain(`style="color:red"`);
  });

  it("does not match an element with no data-* attributes", async () => {
    const out = await runRule(
      "strip-data-attr",
      `<span class="label" style="font-size:14px">Y</span>`
    );

    expect(out).toContain(`class="label"`);
    expect(out).toContain(`style="font-size:14px"`);
  });

  it("strips every data-* attribute when the element has only data-* attributes", async () => {
    const out = await runRule(
      "strip-data-attr",
      `<section data-track="click" data-section="hero">Z</section>`
    );

    expect(out).not.toContain("data-");
    expect(out).toBe("<section>Z</section>");
  });

  it("preserves pipeline-semantic data-block/data-variant/data-slot, strips the rest", async () => {
    const out = await runRule(
      "strip-data-attr",
      `<div data-block="hero" data-variant="a" data-slot="s" data-foo="x">Box</div>`
    );

    expect(out).toContain(`data-block="hero"`);
    expect(out).toContain(`data-variant="a"`);
    expect(out).toContain(`data-slot="s"`);
    expect(out).not.toContain("data-foo");
  });
});

// ── strip-aria-hidden ────────────────────────────────────────────────────────

describe("T-056 AC-003: strip-aria-hidden removes aria-hidden attribute", () => {
  it("removes aria-hidden attribute and preserves other attributes", async () => {
    const out = await runRule(
      "strip-aria-hidden",
      `<span aria-hidden="true" class="icon" role="presentation">Icon</span>`
    );

    expect(out).not.toContain("aria-hidden");
    expect(out).toContain(`class="icon"`);
    expect(out).toContain(`role="presentation"`);
  });

  it("does not match an element without aria-hidden", async () => {
    const out = await runRule(
      "strip-aria-hidden",
      `<div class="container" style="display:block">Y</div>`
    );

    expect(out).toContain(`class="container"`);
    expect(out).toContain(`style="display:block"`);
  });

  it("removes aria-hidden=false as well (attribute presence triggers rule regardless of value)", async () => {
    const out = await runRule(
      "strip-aria-hidden",
      `<button aria-hidden="false" type="button">Z</button>`
    );

    expect(out).not.toContain("aria-hidden");
    expect(out).toContain(`type="button"`);
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

    const el = makeElement("div", { id: "no-style" });

    // strip-calc-expression matcher should not fire (no style)
    const matched = (mod.default as RuleDefinition).matcher(el);
    expect(matched).toBe(false);
  });
});
