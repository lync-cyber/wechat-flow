import type { RuleDefinition } from "../registry.ts";
import { clampPxProp, hasStyleProp } from "./css-helpers.ts";

const PROPS = ["margin-top", "margin-bottom"];

const clampMarginTopBottom: RuleDefinition = {
  id: "clamp-margin-top-bottom",
  scope: "clamp",
  stage: "authoring",
  priority: 80,
  matcher: (node) => hasStyleProp(node, PROPS),
  transform: (node) => clampPxProp(node, PROPS, 0, 48),
  fixture: "rules/builtin/clamp-margin-top-bottom",
};

export default clampMarginTopBottom;
