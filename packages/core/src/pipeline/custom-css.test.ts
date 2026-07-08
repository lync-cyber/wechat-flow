import type { Diagnostic } from "@wechat-flow/contracts";
import type { Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { describe, expect, it } from "vitest";
import { applyCustomCss } from "./custom-css.ts";

// Bridges the current (html: string, ...) => string signature to the target
// (hast: Root, ...) => Root tree-domain signature these RED tests exercise.
type TreeDomainApplyCustomCss = (hast: Root, css: string, diagnostics: Diagnostic[]) => Root;
const applyCustomCssTreeDomain = applyCustomCss as unknown as TreeDomainApplyCustomCss;

function findElementStyle(node: unknown, tagName: string): string | undefined {
  if (!node || typeof node !== "object") return undefined;
  const n = node as {
    type?: string;
    tagName?: string;
    properties?: Record<string, unknown>;
    children?: unknown[];
  };
  if (n.type === "element" && n.tagName === tagName) {
    return typeof n.properties?.style === "string" ? n.properties.style : undefined;
  }
  if (Array.isArray(n.children)) {
    for (const child of n.children) {
      const found = findElementStyle(child, tagName);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

describe("T-182 AC-003: applyCustomCss migrates from string domain to hast tree domain", () => {
  const htmlInput = '<p style="color:red">hi</p>';
  const customCss = "p { font-weight: bold; }";

  it("accepts a hast Root as its first argument and returns a hast Root (type: 'root'), not an HTML string", () => {
    const hastInput = fromHtml(htmlInput, { fragment: true }) as Root;
    const diagnostics: Diagnostic[] = [];

    const result = applyCustomCssTreeDomain(hastInput, customCss, diagnostics);

    expect(result).toMatchObject({ type: "root" });
  });

  it("the <p> element's merged style keeps the original inline declaration and gains the customCss declaration (tree-domain merge semantics equivalent to the prior string-domain juice merge)", () => {
    const hastInput = fromHtml(htmlInput, { fragment: true }) as Root;
    const diagnostics: Diagnostic[] = [];

    const result = applyCustomCssTreeDomain(hastInput, customCss, diagnostics);

    const pStyle = findElementStyle(result, "p") ?? "";
    const declarations = new Set(
      pStyle
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
    );
    expect(declarations.has("color:red")).toBe(true);
    expect(declarations.has("font-weight: bold")).toBe(true);
  });
});
