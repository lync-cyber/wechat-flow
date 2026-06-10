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

// ── AC-001: strip-scope builtin rule files ────────────────────────────────────

describe("T-014 AC-001: strip scope builtin rule count and shape", () => {
  it("imports at least 10 strip-scope RuleDefinition files from builtin directory", async () => {
    const stripRuleIds = [
      "strip-style-tag",
      "strip-script",
      "strip-id-attr",
      "strip-position",
      "strip-js-events",
      "strip-pseudo-classes",
      "strip-flex-gap",
      "strip-transform-origin",
      "strip-font-family",
      "strip-css-var",
    ];

    const rules: RuleDefinition[] = [];
    for (const ruleId of stripRuleIds) {
      const mod = await import(`../../packages/ruleset/src/rules/builtin/${ruleId}.ts`);
      const rule: RuleDefinition =
        mod.default ?? mod[ruleId.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase())];
      rules.push(rule);
    }

    expect(rules.length).toBe(10);
    for (const rule of rules) {
      expect(rule.id).toBeTruthy();
      expect(rule.scope).toBe("strip");
      expect(typeof rule.priority).toBe("number");
      expect(typeof rule.matcher).toBe("function");
      expect(typeof rule.transform).toBe("function");
    }
  });
});

// ── AC-002: strip-style-tag ───────────────────────────────────────────────────

describe("T-014 AC-002: strip-style-tag removes <style> elements from hast", () => {
  it("removes a top-level <style> element containing CSS", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-style-tag.ts");
    const rule: RuleDefinition = mod.default;

    const styleEl = makeElement("style", {}, []);
    const pEl = makeElement("p", { style: "color:red" }, []);
    const hast = makeHast([styleEl, pEl]);

    const result = applyRuleset(hast, [rule]);
    const outputChildren = (result.hast as Root).children as Element[];

    const styleTagsInOutput = outputChildren.filter(
      (c) => c.type === "element" && c.tagName === "style"
    );
    expect(styleTagsInOutput).toHaveLength(0);
  });

  it("preserves non-style sibling elements after stripping style tag", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-style-tag.ts");
    const rule: RuleDefinition = mod.default;

    const styleEl = makeElement("style", {}, []);
    const pEl = makeElement("p", { style: "color:red" }, []);
    const hast = makeHast([styleEl, pEl]);

    const result = applyRuleset(hast, [rule]);
    const outputChildren = (result.hast as Root).children as Element[];

    const pTags = outputChildren.filter((c) => c.type === "element" && c.tagName === "p");
    expect(pTags).toHaveLength(1);
  });

  it("removes nested <style> element inside a div", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-style-tag.ts");
    const rule: RuleDefinition = mod.default;

    const styleEl = makeElement("style", {}, []);
    const divEl = makeElement("div", {}, [styleEl]);
    const hast = makeHast([divEl]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;

    expect(div.children).toHaveLength(0);
  });
});

// ── AC-003: strip-id-attr ────────────────────────────────────────────────────

describe("T-014 AC-003: strip-id-attr removes id attribute from elements", () => {
  it("removes id attribute from a div element", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-id-attr.ts");
    const rule: RuleDefinition = mod.default;

    const divEl = makeElement("div", { id: "anchor", class: "container" }, []);
    const hast = makeHast([divEl]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;

    expect(div.properties).not.toHaveProperty("id");
  });

  it("preserves non-id attributes after stripping id", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-id-attr.ts");
    const rule: RuleDefinition = mod.default;

    const divEl = makeElement("div", { id: "anchor", class: "container" }, []);
    const hast = makeHast([divEl]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;

    expect(div.properties).toHaveProperty("class", "container");
  });

  it("removes id from multiple elements at once", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-id-attr.ts");
    const rule: RuleDefinition = mod.default;

    const h1 = makeElement("h1", { id: "title" }, []);
    const p = makeElement("p", { id: "body", style: "color:red" }, []);
    const hast = makeHast([h1, p]);

    const result = applyRuleset(hast, [rule]);
    const children = (result.hast as Root).children as Element[];

    expect(children[0].properties).not.toHaveProperty("id");
    expect(children[1].properties).not.toHaveProperty("id");
    expect(children[1].properties).toHaveProperty("style", "color:red");
  });
});

// ── AC-004: strip-position ───────────────────────────────────────────────────

describe("T-014 AC-004: strip-position removes position CSS property while preserving others", () => {
  it("removes position:fixed from style, keeps color:red", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-position.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "position:fixed;color:red" }, []);
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).not.toMatch(/position\s*:/);
    expect(style).toMatch(/color\s*:\s*red/);
  });

  it("removes position:absolute from style, keeps font-size", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-position.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "position:absolute;font-size:16px" }, []);
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).not.toMatch(/position\s*:/);
    expect(style).toMatch(/font-size\s*:\s*16px/);
  });

  it("removes position:relative from style", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-position.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "position:relative;color:blue" }, []);
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).not.toMatch(/position\s*:/);
    expect(style).toMatch(/color\s*:\s*blue/);
  });

  it("leaves elements without position style unchanged", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/strip-position.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "color:red;margin:0" }, []);
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).toMatch(/color\s*:\s*red/);
    expect(style).toMatch(/margin\s*:\s*0/);
  });
});
