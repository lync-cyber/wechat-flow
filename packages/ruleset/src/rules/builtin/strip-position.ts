import type { RuleDefinition } from "../registry.ts";
import { hasStyleProp, removeCssDeclarations } from "./css-helpers.ts";

const PROPS = ["position"];

const stripPosition: RuleDefinition = {
  id: "strip-position",
  scope: "strip",
  priority: 90,
  matcher: (node) => hasStyleProp(node, PROPS),
  transform: (node) => removeCssDeclarations(node, PROPS),
};

export default stripPosition;
