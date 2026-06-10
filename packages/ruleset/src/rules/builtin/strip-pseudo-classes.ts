import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";

const PSEUDO_TOKEN =
  /:(?:hover|active|focus|visited|before|after|first-line|first-letter|nth-child|nth-of-type|checked|disabled|placeholder)\b/i;

function getStyle(node: Node): string | undefined {
  if (node.type !== "element") return undefined;
  const style = (node as Element).properties.style;
  return typeof style === "string" ? style : undefined;
}

const stripPseudoClasses: RuleDefinition = {
  id: "strip-pseudo-classes",
  scope: "strip",
  priority: 70,
  matcher: (node) => {
    const style = getStyle(node);
    return style !== undefined && PSEUDO_TOKEN.test(style);
  },
  transform: (node) => {
    const el = node as Element;
    const style = getStyle(node);
    if (style === undefined) return node;
    const cleaned = style
      .split(";")
      .filter((decl) => decl.trim() !== "" && !PSEUDO_TOKEN.test(decl))
      .join(";");
    return { ...el, properties: { ...el.properties, style: cleaned } } as Node;
  },
};

export default stripPseudoClasses;
