import type { Element, ElementContent, Node, Text } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { isTag } from "./css-helpers.ts";

function makeText(value: string): Text {
  return { type: "text", value };
}

function makeEl(tagName: string, children: ElementContent[]): Element {
  return { type: "element", tagName, properties: {}, children };
}

function ulToTable(ul: Element): Element {
  const liChildren = ul.children.filter(
    (c): c is Element => c.type === "element" && c.tagName === "li"
  );
  const rows: Element[] = liChildren.map((li) => {
    const markerTd = makeEl("td", [makeText("•")]);
    const contentTd = makeEl("td", li.children as ElementContent[]);
    return makeEl("tr", [markerTd, contentTd]);
  });
  const tbody = makeEl("tbody", rows);
  return makeEl("table", [tbody]);
}

const transformListToTable: RuleDefinition = {
  id: "transform-list-to-table",
  scope: "transform",
  priority: 60,
  matcher: (node: Node) => isTag(node, "ul"),
  transform: (node: Node): Node => ulToTable(node as Element),
};

export default transformListToTable;
