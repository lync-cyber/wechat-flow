import type { RuleDefinition } from "@wechat-flow/ruleset";
import type { Element, Node } from "hast";
import { beforeAll, describe, expect, it } from "vitest";
import { registerTheme, renderMarkdown } from "../../../packages/core/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";

beforeAll(() => {
  registerTheme(defaultTheme);
});

// The "default" theme's authored `p` color (packages/themes/default/src/blocks/paragraph.ts).
// inlineStyle serializes it as "color: #1C1917" (see serializeDeclarations space-after-colon format).
const DEFAULT_P_COLOR_DECLARATION = "color: #1C1917";

const detectComputedColorRule = {
  id: "t182-detect-computed-color",
  scope: "transform" as const,
  priority: 1,
  matcher: (node: Node) => {
    const el = node as Element;
    return (
      el.type === "element" &&
      el.tagName === "p" &&
      typeof el.properties?.style === "string" &&
      (el.properties.style as string).includes(DEFAULT_P_COLOR_DECLARATION)
    );
  },
  transform: (node: Node) => {
    const el = node as Element;
    return { ...el, properties: { ...el.properties, "data-detected-computed-color": "1" } };
  },
  stage: "output",
} as unknown as RuleDefinition;

describe("T-182 AC-002: output-stage rules execute after inlineStyle synthesis, not before", () => {
  it("an output-stage rule matcher observes the inlineStyle-computed <p> color and its transform reaches the serialized html", async () => {
    const result = await renderMarkdown("Some paragraph text.", {
      themeId: "default",
      rules: [detectComputedColorRule],
    });

    expect(result.html).toMatch(/data-detected-computed-color="1"/);
  });
});

describe("T-182 AC-003+AC-004: customCss now runs in tree domain before nightRisk collection consumes the final tree", () => {
  it("a customCss declaration that drives foreground/background to the same low-contrast color is captured by report.nightRiskIssues", async () => {
    const result = await renderMarkdown("Some paragraph text.", {
      themeId: "default",
      customCss: "p { color: #ffffff; background-color: #ffffff; }",
    });

    const whiteOnWhite = result.report.nightRiskIssues.find(
      (issue) =>
        issue.foreground.toLowerCase() === "#ffffff" && issue.background.toLowerCase() === "#ffffff"
    );
    expect(whiteOnWhite).toBeDefined();
    expect(whiteOnWhite?.contrastRatio).toBeLessThan(4.5);
  });
});
