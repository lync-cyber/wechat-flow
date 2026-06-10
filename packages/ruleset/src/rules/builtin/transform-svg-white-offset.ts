import type { Element, Node, Parent } from "hast";
import type { RuleDefinition } from "../registry.ts";

const WHITE_HEX = /^#ffffff$/i;

function replaceWhiteInNode(node: Node): Node {
  const el = node as Element;
  if (el.type !== "element") return node;

  let updated: Element = { ...el, properties: { ...el.properties } };

  for (const attrName of Object.keys(updated.properties ?? {})) {
    const val = updated.properties[attrName];
    if (typeof val === "string" && WHITE_HEX.test(val.trim())) {
      updated = {
        ...updated,
        properties: { ...updated.properties, [attrName]: "#fefefe" },
      };
    }
  }

  if ("children" in updated) {
    const parent = updated as unknown as Parent;
    return {
      ...parent,
      children: parent.children.map(replaceWhiteInNode),
    } as unknown as Node;
  }
  return updated;
}

const transformSvgWhiteOffset: RuleDefinition = {
  id: "transform-svg-white-offset",
  scope: "transform",
  priority: 60,
  matcher: (node: Node) => {
    const el = node as Element;
    return el.type === "element" && el.tagName === "svg";
  },
  transform: (node: Node): Node => replaceWhiteInNode(node),
};

export default transformSvgWhiteOffset;
