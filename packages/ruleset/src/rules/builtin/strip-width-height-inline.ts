import type { RuleDefinition } from "../registry.ts";
import { hasStyleProp, removeCssDeclarations } from "./css-helpers.ts";

const PROPS = ["width", "height"];

const stripWidthHeightInline: RuleDefinition = {
  id: "strip-width-height-inline",
  scope: "strip",
  priority: 85,
  matcher: (node) => hasStyleProp(node, PROPS),
  transform: (node) => removeCssDeclarations(node, PROPS),
};

export default stripWidthHeightInline;
