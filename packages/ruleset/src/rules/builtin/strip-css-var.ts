import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { parseDeclarations, serializeDeclarations } from "./css-helpers.ts";

function hasCssVars(node: Node): boolean {
  if (node.type !== "element") return false;
  const style = (node as Element).properties?.style;
  if (typeof style !== "string") return false;
  return style.includes("--") || style.includes("var(");
}

function expandCssVars(node: Node): Node {
  const el = node as Element;
  const style = el.properties?.style as string;
  const decls = parseDeclarations(style);

  // Collect custom property definitions (--name: value)
  const varMap = new Map<string, string>();
  for (const [prop, val] of decls) {
    if (prop.startsWith("--")) {
      varMap.set(prop, val);
    }
  }

  // Expand var() references, drop custom property declarations
  const resolved = decls
    .filter(([prop]) => !prop.startsWith("--"))
    .map(([prop, val]): [string, string] => {
      const expanded = val.replace(/var\((--[^)]+)\)/g, (_, name: string) => {
        return varMap.get(name.trim()) ?? val;
      });
      return [prop, expanded];
    });

  return {
    ...el,
    properties: { ...el.properties, style: serializeDeclarations(resolved) },
  } as Node;
}

const stripCssVar: RuleDefinition = {
  id: "strip-css-var",
  scope: "strip",
  priority: 90,
  matcher: hasCssVars,
  transform: expandCssVars,
};

export default stripCssVar;
