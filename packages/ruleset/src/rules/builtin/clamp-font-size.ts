import type { RuleDefinition } from "../registry.ts";
import { clampPxProp, hasStyleProp } from "./css-helpers.ts";

const clampFontSize: RuleDefinition = {
  id: "clamp-font-size",
  scope: "clamp",
  priority: 80,
  matcher: (node) => hasStyleProp(node, ["font-size"]),
  transform: (node) => clampPxProp(node, ["font-size"], 14, 32),
};

export default clampFontSize;
