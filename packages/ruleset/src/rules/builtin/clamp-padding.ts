import type { RuleDefinition } from "../registry.ts";
import { clampPxProp, hasStyleProp } from "./css-helpers.ts";

const clampPadding: RuleDefinition = {
  id: "clamp-padding",
  scope: "clamp",
  priority: 80,
  matcher: (node) => hasStyleProp(node, ["padding"]),
  transform: (node) => clampPxProp(node, ["padding"], 0, 48),
};

export default clampPadding;
