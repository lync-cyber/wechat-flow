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

// ── AC-002 shape checks for new clamp rules ──────────────────────────────────

describe("T-056 AC-002: new clamp rules have required shape fields", () => {
  const newClampRuleIds = [
    "clamp-letter-spacing",
    "clamp-border-radius",
    "clamp-padding",
    "clamp-margin-top-bottom",
    "clamp-word-spacing",
    "clamp-text-indent",
  ];

  it("each new clamp rule exports a RuleDefinition with all five required fields", async () => {
    for (const ruleId of newClampRuleIds) {
      const mod = await import(`../../packages/ruleset/src/rules/builtin/${ruleId}.ts`);
      const rule: RuleDefinition = mod.default;

      expect(typeof rule.id).toBe("string");
      expect(rule.id).toBe(ruleId);
      expect(rule.scope).toBe("clamp");
      expect(typeof rule.priority).toBe("number");
      expect(typeof rule.matcher).toBe("function");
      expect(typeof rule.transform).toBe("function");
    }
  });
});

// ── clamp-letter-spacing ─────────────────────────────────────────────────────

describe("T-056 AC-005: clamp-letter-spacing clamps to [-0.05em, 0.2em]", () => {
  it("clamps letter-spacing:0.5em down to 0.2em (maximum)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-letter-spacing.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "letter-spacing:0.5em" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/letter-spacing\s*:\s*0\.2em/);
  });

  it("clamps letter-spacing:-0.1em up to -0.05em (minimum)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-letter-spacing.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "letter-spacing:-0.1em" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/letter-spacing\s*:\s*-0\.05em/);
  });

  it("leaves letter-spacing:0.1em unchanged (within range)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-letter-spacing.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("span", { style: "letter-spacing:0.1em;color:red" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const span = (result.hast as Root).children[0] as Element;
    const style = span.properties.style as string;

    expect(style).toMatch(/letter-spacing\s*:\s*0\.1em/);
    expect(style).toMatch(/color\s*:\s*red/);
  });

  it("does not transform letter-spacing with non-em unit (no-match boundary)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-letter-spacing.ts");
    const rule: RuleDefinition = mod.default;

    // px unit — rule should leave value unchanged (NaN for em parse)
    const el = makeElement("p", { style: "letter-spacing:5px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    // value returned as-is when unit cannot be parsed as em
    expect(style).toMatch(/letter-spacing\s*:\s*5px/);
  });
});

// ── clamp-border-radius ──────────────────────────────────────────────────────

describe("T-056 AC-005: clamp-border-radius clamps to [0px, 24px]", () => {
  it("clamps border-radius:50px down to 24px (maximum)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-border-radius.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "border-radius:50px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).toMatch(/border-radius\s*:\s*24px/);
  });

  it("clamps border-radius:-4px up to 0px (minimum)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-border-radius.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "border-radius:-4px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).toMatch(/border-radius\s*:\s*0px/);
  });

  it("leaves border-radius:12px unchanged (within range)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-border-radius.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("button", { style: "border-radius:12px;background:blue" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const btn = (result.hast as Root).children[0] as Element;
    const style = btn.properties.style as string;

    expect(style).toMatch(/border-radius\s*:\s*12px/);
    expect(style).toMatch(/background\s*:\s*blue/);
  });

  it("does not match element without border-radius in style", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-border-radius.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "color:green" });
    const matched = (rule as RuleDefinition).matcher(el);

    expect(matched).toBe(false);
  });
});

// ── clamp-padding ────────────────────────────────────────────────────────────

describe("T-056 AC-005: clamp-padding clamps single-value padding to [0px, 48px]", () => {
  it("clamps padding:80px down to 48px (maximum)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-padding.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "padding:80px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).toMatch(/padding\s*:\s*48px/);
  });

  it("clamps padding:-4px up to 0px (minimum)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-padding.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "padding:-4px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).toMatch(/padding\s*:\s*0px/);
  });

  it("leaves padding:24px unchanged (within range)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-padding.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("section", { style: "padding:24px;color:red" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const section = (result.hast as Root).children[0] as Element;
    const style = section.properties.style as string;

    expect(style).toMatch(/padding\s*:\s*24px/);
    expect(style).toMatch(/color\s*:\s*red/);
  });

  it("does not match element without padding in style", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-padding.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "margin:8px" });
    const matched = (rule as RuleDefinition).matcher(el);

    expect(matched).toBe(false);
  });
});

// ── clamp-margin-top-bottom ──────────────────────────────────────────────────

describe("T-056 AC-005: clamp-margin-top-bottom clamps margin-top/bottom to [0px, 48px]", () => {
  it("clamps margin-top:60px down to 48px (maximum)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-margin-top-bottom.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "margin-top:60px;color:red" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).toMatch(/margin-top\s*:\s*48px/);
    expect(style).toMatch(/color\s*:\s*red/);
  });

  it("clamps margin-bottom:100px down to 48px (maximum)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-margin-top-bottom.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "margin-bottom:100px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/margin-bottom\s*:\s*48px/);
  });

  it("clamps margin-top:-8px up to 0px (minimum)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-margin-top-bottom.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "margin-top:-8px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).toMatch(/margin-top\s*:\s*0px/);
  });

  it("leaves margin-top:20px unchanged (within range)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-margin-top-bottom.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("h2", { style: "margin-top:20px;margin-bottom:16px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const h2 = (result.hast as Root).children[0] as Element;
    const style = h2.properties.style as string;

    expect(style).toMatch(/margin-top\s*:\s*20px/);
    expect(style).toMatch(/margin-bottom\s*:\s*16px/);
  });

  it("does not match element with only margin-left (no top/bottom)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-margin-top-bottom.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "margin-left:8px" });
    const matched = (rule as RuleDefinition).matcher(el);

    expect(matched).toBe(false);
  });
});

// ── clamp-word-spacing ───────────────────────────────────────────────────────

describe("T-056 AC-005: clamp-word-spacing clamps to [0px, 8px]", () => {
  it("clamps word-spacing:20px down to 8px (maximum)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-word-spacing.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "word-spacing:20px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/word-spacing\s*:\s*8px/);
  });

  it("clamps word-spacing:-2px up to 0px (minimum)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-word-spacing.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("span", { style: "word-spacing:-2px;font-size:14px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const span = (result.hast as Root).children[0] as Element;
    const style = span.properties.style as string;

    expect(style).toMatch(/word-spacing\s*:\s*0px/);
    expect(style).toMatch(/font-size\s*:\s*14px/);
  });

  it("leaves word-spacing:4px unchanged (within range)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-word-spacing.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "word-spacing:4px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/word-spacing\s*:\s*4px/);
  });

  it("does not match element without word-spacing in style", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-word-spacing.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "letter-spacing:0.05em" });
    const matched = (rule as RuleDefinition).matcher(el);

    expect(matched).toBe(false);
  });
});

// ── clamp-text-indent ────────────────────────────────────────────────────────

describe("T-056 AC-005: clamp-text-indent clamps to [0px, 64px]", () => {
  it("clamps text-indent:100px down to 64px (maximum)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-text-indent.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "text-indent:100px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/text-indent\s*:\s*64px/);
  });

  it("clamps text-indent:-10px up to 0px (minimum)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-text-indent.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "text-indent:-10px;color:black" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/text-indent\s*:\s*0px/);
    expect(style).toMatch(/color\s*:\s*black/);
  });

  it("leaves text-indent:32px unchanged (within range)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-text-indent.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("p", { style: "text-indent:32px" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/text-indent\s*:\s*32px/);
  });

  it("does not match element without text-indent in style", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-text-indent.ts");
    const rule: RuleDefinition = mod.default;

    const el = makeElement("div", { style: "padding:8px" });
    const matched = (rule as RuleDefinition).matcher(el);

    expect(matched).toBe(false);
  });

  it("returns node unchanged when NaN parsed (non-px unit or missing value)", async () => {
    const mod = await import("../../packages/ruleset/src/rules/builtin/clamp-text-indent.ts");
    const rule: RuleDefinition = mod.default;

    // "auto" is not a numeric value — rule should leave it as-is
    const el = makeElement("p", { style: "text-indent:auto" });
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [rule]);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/text-indent\s*:\s*auto/);
  });
});
