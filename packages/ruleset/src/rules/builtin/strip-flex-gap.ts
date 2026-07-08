import type { RuleDefinition } from "../registry.ts";
import { hasStyleProp, removeCssDeclarations } from "./css-helpers.ts";

const PROPS = ["gap", "justify-content", "align-items"];

const stripFlexGap: RuleDefinition = {
  id: "strip-flex-gap",
  scope: "strip",
  stage: "authoring",
  priority: 80,
  matcher: (node) => hasStyleProp(node, PROPS),
  transform: (node) => removeCssDeclarations(node, PROPS),
  fixture: "rules/builtin/strip-flex-gap",
};

export default stripFlexGap;
