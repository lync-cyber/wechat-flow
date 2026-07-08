import type { RuleDefinition } from "../registry.ts";
import { hasStyleProp, removeCssDeclarations } from "./css-helpers.ts";

const PROPS = ["transform-origin"];

const stripTransformOrigin: RuleDefinition = {
  id: "strip-transform-origin",
  scope: "strip",
  stage: "output",
  priority: 80,
  matcher: (node) => hasStyleProp(node, PROPS),
  transform: (node) => removeCssDeclarations(node, PROPS),
  fixture: "rules/builtin/strip-transform-origin",
};

export default stripTransformOrigin;
