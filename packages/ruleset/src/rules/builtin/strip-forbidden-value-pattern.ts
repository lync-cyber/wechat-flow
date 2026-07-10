import { isForbiddenCssValue } from "@wechat-flow/contracts";
import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { parseDeclarations, serializeDeclarations } from "./css-helpers.ts";

function hasForbiddenValuePattern(node: Node): boolean {
  const el = node as Element;
  if (el.type !== "element") return false;
  const style = el.properties?.style;
  if (typeof style !== "string") return false;
  return parseDeclarations(style).some(([prop, val]) => isForbiddenCssValue(`${prop}: ${val}`));
}

const stripForbiddenValuePattern: RuleDefinition = {
  id: "strip-forbidden-value-pattern",
  scope: "strip",
  stage: "output",
  priority: 85,
  matcher: hasForbiddenValuePattern,
  transform: (node: Node): Node => {
    const el = node as Element;
    const style = el.properties?.style as string;
    const decls = parseDeclarations(style);
    const kept = decls.filter(([prop, val]) => !isForbiddenCssValue(`${prop}: ${val}`));
    if (kept.length === decls.length) return node;
    return {
      ...el,
      properties: { ...el.properties, style: serializeDeclarations(kept) },
    } as unknown as Node;
  },
  fixture: "rules/builtin/strip-forbidden-value-pattern",
};

export default stripForbiddenValuePattern;
