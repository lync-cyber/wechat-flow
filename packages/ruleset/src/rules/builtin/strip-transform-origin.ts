import type { RuleDefinition } from "../registry.ts";
import { hasStyleProp, removeCssDeclarations } from "./css-helpers.ts";

const PROPS = ["transform-origin"];

const stripTransformOrigin: RuleDefinition = {
  id: "strip-transform-origin",
  scope: "strip",
  priority: 80,
  matcher: (node) => hasStyleProp(node, PROPS),
  transform: (node) => removeCssDeclarations(node, PROPS),
};

export default stripTransformOrigin;
