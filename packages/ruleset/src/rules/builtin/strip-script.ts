import type { RuleDefinition } from "../registry.ts";
import { isTag } from "./css-helpers.ts";

const stripScript: RuleDefinition = {
  id: "strip-script",
  scope: "strip",
  priority: 100,
  matcher: (node) => isTag(node, "script"),
  transform: () => null,
  fixture: "rules/builtin/strip-script",
};

export default stripScript;
