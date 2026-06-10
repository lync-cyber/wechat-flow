import type { Root } from "hast";

// Minimum placeholder — structural rewrite (e.g. ul/ol → table) is not covered by current ACs.
// Future callers may extend this to perform WeChat-specific DOM restructuring.
export function rewriteStructure(tree: Root): Root {
  return tree;
}
