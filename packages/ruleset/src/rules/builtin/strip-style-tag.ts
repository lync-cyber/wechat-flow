import type { RuleDefinition } from "../registry.ts";
import { isTag } from "./css-helpers.ts";

const stripStyleTag: RuleDefinition = {
  id: "strip-style-tag",
  scope: "strip",
  priority: 100,
  matcher: (node) => isTag(node, "style"),
  transform: () => null,
  fixture: "rules/builtin/strip-style-tag",
};

export default stripStyleTag;
