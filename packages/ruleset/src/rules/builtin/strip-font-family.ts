import type { RuleDefinition } from "../registry.ts";
import { hasStyleProp, removeCssDeclarations } from "./css-helpers.ts";

const PROPS = ["font-family"];

const stripFontFamily: RuleDefinition = {
  id: "strip-font-family",
  scope: "strip",
  priority: 80,
  matcher: (node) => hasStyleProp(node, PROPS),
  transform: (node) => removeCssDeclarations(node, PROPS),
};

export default stripFontFamily;
