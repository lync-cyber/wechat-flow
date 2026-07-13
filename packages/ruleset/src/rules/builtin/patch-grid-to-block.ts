import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { parseDeclarations, serializeDeclarations } from "./css-helpers.ts";

function hasGridDisplay(node: Node): boolean {
  const el = node as Element;
  if (el.type !== "element") return false;
  const style = el.properties?.style;
  if (typeof style !== "string") return false;
  return parseDeclarations(style).some(
    ([prop, val]) => prop === "display" && (val.trim() === "grid" || val.trim() === "inline-grid")
  );
}

const patchGridToBlock: RuleDefinition = {
  id: "patch-grid-to-block",
  scope: "patch",
  stage: "output",
  priority: 50,
  matcher: hasGridDisplay,
  transform: (node: Node): Node => {
    const el = node as Element;
    const style = el.properties?.style as string;
    const decls = parseDeclarations(style);
    const updated = decls.map(([prop, val]): [string, string] => {
      if (prop !== "display") return [prop, val];
      if (val.trim() === "grid") return [prop, "block"];
      if (val.trim() === "inline-grid") return [prop, "inline-block"];
      return [prop, val];
    });
    return {
      ...el,
      properties: { ...el.properties, style: serializeDeclarations(updated) },
    } as unknown as Node;
  },
  fixture: "rules/builtin/patch-grid-to-block",
};

export default patchGridToBlock;
