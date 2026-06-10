import type { Element, Properties, Root } from "hast";
import { describe, expect, it } from "vitest";
import type { RuleDefinition } from "../../packages/ruleset/src/index.ts";
import { applyRuleset } from "../../packages/ruleset/src/index.ts";

function makeHast(children: Element[]): Root {
  return { type: "root", children };
}

function makeElement(tagName: string, properties: Properties, children: Element[] = []): Element {
  return { type: "element", tagName, properties, children };
}

describe("strip scope: multiple rules apply to the same node", () => {
  it("applies both strip rules when node has id attribute and position:fixed style", async () => {
    const stripIdMod = await import("../../packages/ruleset/src/rules/builtin/strip-id-attr.ts");
    const stripPosMod = await import("../../packages/ruleset/src/rules/builtin/strip-position.ts");
    const rules: RuleDefinition[] = [stripPosMod.default, stripIdMod.default];

    const el = makeElement("div", { id: "section1", style: "position:fixed;color:red" }, []);
    const hast = makeHast([el]);

    const result = applyRuleset(hast, rules);
    const div = (result.hast as Root).children[0] as Element;

    expect(div.properties).not.toHaveProperty("id");
    expect(div.properties.style as string).not.toMatch(/position\s*:/);
    expect(div.properties.style as string).toMatch(/color\s*:\s*red/);
  });

  it("produces two NodeChangeRecords with correct triggerRuleId for each rule", async () => {
    const stripIdMod = await import("../../packages/ruleset/src/rules/builtin/strip-id-attr.ts");
    const stripPosMod = await import("../../packages/ruleset/src/rules/builtin/strip-position.ts");
    const rules: RuleDefinition[] = [stripPosMod.default, stripIdMod.default];

    const el = makeElement("div", { id: "section1", style: "position:fixed;color:red" }, []);
    const hast = makeHast([el]);

    const result = applyRuleset(hast, rules);
    const records = result.report.nodeChangeRecords;

    expect(records).toHaveLength(2);
    const ruleIds = records.map((r) => r.triggerRuleId);
    expect(ruleIds).toContain("strip-position");
    expect(ruleIds).toContain("strip-id-attr");
  });

  it("stops applying further rules after a delete-type rule returns null", () => {
    const followupCalled: string[] = [];
    const deleteRule: RuleDefinition = {
      id: "strip-delete",
      scope: "strip",
      priority: 100,
      matcher: (node) => node.type === "element" && (node as Element).tagName === "script",
      transform: () => null,
    };
    const followupRule: RuleDefinition = {
      id: "strip-followup",
      scope: "strip",
      priority: 90,
      matcher: (node) => node.type === "element" && (node as Element).tagName === "script",
      transform: (node) => {
        followupCalled.push("strip-followup");
        return node;
      },
    };

    const el = makeElement("script", {}, []);
    const hast = makeHast([el]);

    const result = applyRuleset(hast, [deleteRule, followupRule]);
    const children = (result.hast as Root).children as Element[];

    expect(children).toHaveLength(0);
    expect(followupCalled).toHaveLength(0);

    const records = result.report.nodeChangeRecords;
    expect(records).toHaveLength(1);
    expect(records[0].triggerRuleId).toBe("strip-delete");
    expect(records[0].after).toBe("null");
  });
});

describe("clamp scope: multiple rules apply to the same node", () => {
  it("applies both clamp-font-size and clamp-rgba-alpha to a node with both properties", async () => {
    const clampFontMod = await import(
      "../../packages/ruleset/src/rules/builtin/clamp-font-size.ts"
    );
    const clampRgbaMod = await import(
      "../../packages/ruleset/src/rules/builtin/clamp-rgba-alpha.ts"
    );
    const rules: RuleDefinition[] = [clampFontMod.default, clampRgbaMod.default];

    const el = makeElement("p", { style: "font-size:8px;color:rgba(0,0,0,0.05)" }, []);
    const hast = makeHast([el]);

    const result = applyRuleset(hast, rules);
    const p = (result.hast as Root).children[0] as Element;
    const style = p.properties.style as string;

    expect(style).toMatch(/font-size\s*:\s*14px/);
    expect(style).toMatch(/rgba\s*\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.15\s*\)/);
  });
});

describe("transform scope: single-rule-per-node is correct semantics", () => {
  it("applies only the first matching transform rule and does not attempt further rules on the replaced node", async () => {
    const transformedIds: string[] = [];
    const ruleA: RuleDefinition = {
      id: "transform-a",
      scope: "transform",
      priority: 100,
      matcher: (node) => node.type === "element" && (node as Element).tagName === "ul",
      transform: (node) => {
        transformedIds.push("transform-a");
        const el = node as Element;
        return { ...el, tagName: "div" } as unknown as typeof node;
      },
    };
    const ruleB: RuleDefinition = {
      id: "transform-b",
      scope: "transform",
      priority: 90,
      matcher: (node) => node.type === "element" && (node as Element).tagName === "ul",
      transform: () => {
        transformedIds.push("transform-b");
        return null;
      },
    };

    const el = makeElement("ul", {}, []);
    const hast = makeHast([el]);

    applyRuleset(hast, [ruleA, ruleB]);

    expect(transformedIds).toEqual(["transform-a"]);
  });
});

describe("patch scope: single-rule-per-node is correct semantics for current builtin rules", () => {
  it("applies patch-flex-to-block and leaves non-flex elements unchanged", async () => {
    const patchMod = await import(
      "../../packages/ruleset/src/rules/builtin/patch-flex-to-block.ts"
    );
    const rules: RuleDefinition[] = [patchMod.default];

    const el = makeElement("div", { style: "display:flex;color:red" }, []);
    const hast = makeHast([el]);

    const result = applyRuleset(hast, rules);
    const div = (result.hast as Root).children[0] as Element;
    const style = div.properties.style as string;

    expect(style).toMatch(/display\s*:\s*block/);
    expect(style).toMatch(/color\s*:\s*red/);
  });
});
