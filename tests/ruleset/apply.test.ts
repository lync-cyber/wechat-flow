import type { Element, Properties, Root } from "hast";
import { describe, expect, it } from "vitest";
import type { RuleDefinition } from "../../packages/ruleset/src/index.ts";
import { applyRuleset, getRulesetVersion } from "../../packages/ruleset/src/index.ts";

function makeHast(children: Element[]): Root {
  return { type: "root", children };
}

function makeElement(tagName: string, properties: Properties, children: Element[] = []): Element {
  return { type: "element", tagName, properties, children };
}

describe("AC-001: applyRuleset with empty ruleset", () => {
  it("returns the original hast unmodified", () => {
    const el = makeElement("p", { style: "color:red" });
    const hast = makeHast([el]);
    const original = JSON.stringify(hast);

    const result = applyRuleset(hast, []);

    expect(JSON.stringify(result.hast)).toBe(original);
  });

  it("returns a DiagnosticReport with empty diagnostics, nodeChangeRecords, and nightRiskIssues", () => {
    const hast = makeHast([makeElement("p", {})]);

    const result = applyRuleset(hast, []);

    expect(result.report.diagnostics).toEqual([]);
    expect(result.report.nodeChangeRecords).toEqual([]);
    expect(result.report.nightRiskIssues).toEqual([]);
  });

  it("returns a versionTriple with string fields in report", () => {
    const hast = makeHast([]);

    const result = applyRuleset(hast, []);

    expect(typeof result.report.versionTriple.rulesetVersion).toBe("string");
    expect(typeof result.report.versionTriple.coreVersion).toBe("string");
    expect(typeof result.report.versionTriple.themeVersion).toBe("string");
  });
});

describe("AC-002: strip scope rule removes style attributes", () => {
  it("removes style attribute from all elements when strip rule targets style", () => {
    const hast = makeHast([
      makeElement("p", { style: "color:red", id: "p1" }),
      makeElement("span", { style: "font-size:14px" }),
    ]);

    const stripStyleRule: RuleDefinition = {
      id: "strip-style",
      scope: "strip",
      priority: 100,
      matcher: (node) => node.type === "element" && "style" in (node as Element).properties,
      transform: (node) => {
        const el = node as Element;
        const { style: _style, ...rest } = el.properties;
        return { ...el, properties: rest };
      },
    };

    const result = applyRuleset(hast, [stripStyleRule]);

    const p = (result.hast as Root).children[0] as Element;
    const span = (result.hast as Root).children[1] as Element;
    expect(p.properties).not.toHaveProperty("style");
    expect(span.properties).not.toHaveProperty("style");
    expect(p.properties).toHaveProperty("id", "p1");
  });

  it("records nodeChangeRecords with triggerRuleId for each transformed node", () => {
    const hast = makeHast([makeElement("p", { style: "color:red" })]);

    const stripStyleRule: RuleDefinition = {
      id: "strip-style",
      scope: "strip",
      priority: 100,
      matcher: (node) => node.type === "element" && "style" in (node as Element).properties,
      transform: (node) => {
        const el = node as Element;
        const { style: _style, ...rest } = el.properties;
        return { ...el, properties: rest };
      },
    };

    const result = applyRuleset(hast, [stripStyleRule]);

    expect(result.report.nodeChangeRecords.length).toBeGreaterThanOrEqual(1);
    const record = result.report.nodeChangeRecords[0];
    expect(record.triggerRuleId).toBe("strip-style");
  });
});

describe("AC-003: getRulesetVersion returns package.json version", () => {
  it("returns the version string from @wechat-flow/ruleset package.json", () => {
    const version = getRulesetVersion();

    expect(typeof version).toBe("string");
    expect(version.length).toBeGreaterThan(0);
    expect(version).toBe("0.0.0");
  });
});
