import type { RuleDefinition } from "../registry.ts";
import { clampPxProp, hasStyleProp } from "./css-helpers.ts";

const clampWordSpacing: RuleDefinition = {
  id: "clamp-word-spacing",
  scope: "clamp",
  stage: "authoring",
  priority: 80,
  matcher: (node) => hasStyleProp(node, ["word-spacing"]),
  transform: (node) => clampPxProp(node, ["word-spacing"], 0, 8),
  fixture: "rules/builtin/clamp-word-spacing",
};

export default clampWordSpacing;
