import type { Element, Root as HastRoot } from "hast";
import { describe, expect, it } from "vitest";
import { collectNightRiskIssues } from "../../packages/core/src/pipeline/readability.ts";
import { wcagContrast } from "../../packages/palette/src/index.ts";

function makeParagraph(style: string, text = "text", tagName = "p"): Element {
  return {
    type: "element",
    tagName,
    properties: { style },
    children: [{ type: "text", value: text }],
  };
}

function makeRoot(children: Element[]): HastRoot {
  return { type: "root", children };
}

describe("AC-001: low-contrast foreground against default white background", () => {
  it("reports one entry with real contrast/foreground/background/nodeSelector/suggestion values", () => {
    // sanity: verify #EEEEEE on #FFFFFF is genuinely below WCAG AA before asserting on it
    expect(wcagContrast("#EEEEEE", "#FFFFFF")).toBeLessThan(4.5);

    const hast = makeRoot([makeParagraph("color: #EEEEEE")]);

    const issues = collectNightRiskIssues(hast);

    expect(issues).toHaveLength(1);
    const [entry] = issues;
    expect(entry.contrastRatio).toBeLessThan(4.5);
    expect(entry.contrastRatio).toBeCloseTo(wcagContrast("#EEEEEE", "#FFFFFF"), 2);
    expect(entry.foreground.toLowerCase()).toBe("#eeeeee");
    expect(entry.background.toLowerCase()).toBe("#ffffff");
    expect(entry.nodeSelector.length).toBeGreaterThan(0);
    expect(entry.nodeSelector).toMatch(/p/);
    expect(entry.suggestion.length).toBeGreaterThan(0);
  });

  it("uses options.defaultBackground instead of #ffffff when no ancestor background is set", () => {
    // sanity: #EEEEEE on a light-gray custom background is genuinely below AA
    expect(wcagContrast("#EEEEEE", "#DDDDDD")).toBeLessThan(4.5);

    const hast = makeRoot([makeParagraph("color: #EEEEEE")]);

    const issues = collectNightRiskIssues(hast, { defaultBackground: "#DDDDDD" });

    expect(issues).toHaveLength(1);
    expect(issues[0].background.toLowerCase()).toBe("#dddddd");
    expect(issues[0].contrastRatio).toBeCloseTo(wcagContrast("#EEEEEE", "#DDDDDD"), 2);
  });
});

describe("AC-002: sufficient contrast produces no entries", () => {
  it("returns an empty array when foreground/background meet WCAG AA", () => {
    // sanity: #333333 on #FFFFFF comfortably passes AA (4.5:1)
    expect(wcagContrast("#333333", "#FFFFFF")).toBeGreaterThanOrEqual(4.5);

    const hast = makeRoot([makeParagraph("color: #333333")]);

    const issues = collectNightRiskIssues(hast);

    expect(issues).toEqual([]);
  });
});

describe("AC-004: duplicate low-contrast nodeSelectors are deduplicated", () => {
  it("collapses two low-contrast <p> nodes with the same selector into a single entry", () => {
    const hast = makeRoot([
      makeParagraph("color: #EEEEEE", "first"),
      makeParagraph("color: #EEEEEE", "second"),
    ]);

    const issues = collectNightRiskIssues(hast);

    expect(issues).toHaveLength(1);
  });

  it("does not deduplicate distinct tag selectors even if both are low-contrast", () => {
    const hast = makeRoot([
      makeParagraph("color: #EEEEEE", "para", "p"),
      makeParagraph("color: #EEEEEE", "heading", "h2"),
    ]);

    const issues = collectNightRiskIssues(hast);

    expect(issues.length).toBeGreaterThanOrEqual(2);
  });
});

describe("AC-005: unparseable foreground colors are safely skipped", () => {
  it("does not throw and produces no entry for rgb() foreground", () => {
    const hast = makeRoot([makeParagraph("color: rgb(200, 200, 200)")]);

    expect(() => collectNightRiskIssues(hast)).not.toThrow();
    expect(collectNightRiskIssues(hast)).toEqual([]);
  });

  it("does not throw and produces no entry for named-color foreground", () => {
    const hast = makeRoot([makeParagraph("color: grey")]);

    expect(() => collectNightRiskIssues(hast)).not.toThrow();
    expect(collectNightRiskIssues(hast)).toEqual([]);
  });

  it("does not throw and produces no entry when color is not declared at all", () => {
    const hast = makeRoot([makeParagraph("font-size: 15px")]);

    expect(() => collectNightRiskIssues(hast)).not.toThrow();
    expect(collectNightRiskIssues(hast)).toEqual([]);
  });
});
