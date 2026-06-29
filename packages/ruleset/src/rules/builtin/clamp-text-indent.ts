import type { RuleDefinition } from "../registry.ts";
import { clampPxProp, hasStyleProp } from "./css-helpers.ts";

const clampTextIndent: RuleDefinition = {
  id: "clamp-text-indent",
  scope: "clamp",
  priority: 80,
  matcher: (node) => hasStyleProp(node, ["text-indent"]),
  transform: (node) => clampPxProp(node, ["text-indent"], 0, 64),
};

export default clampTextIndent;
