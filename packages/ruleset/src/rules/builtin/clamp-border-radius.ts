import type { RuleDefinition } from "../registry.ts";
import { clampPxProp, hasStyleProp } from "./css-helpers.ts";

const clampBorderRadius: RuleDefinition = {
  id: "clamp-border-radius",
  scope: "clamp",
  priority: 80,
  matcher: (node) => hasStyleProp(node, ["border-radius"]),
  transform: (node) => clampPxProp(node, ["border-radius"], 0, 24),
};

export default clampBorderRadius;
