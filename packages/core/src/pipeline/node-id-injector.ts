import type { Element, Root as HastRoot } from "hast";

const BLOCK_ELEMENTS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "ul",
  "ol",
  "li",
  "pre",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "div",
  "section",
  "article",
  "hr",
]);

function getSourceLine(node: Element): number {
  // hast standard: position is a top-level field on the node
  const stdLine = node.position?.start?.line;
  if (typeof stdLine === "number") return stdLine;
  // biome-ignore lint/suspicious/noExplicitAny: test fixtures may carry position inside data
  const dataLine = (node.data as any)?.position?.start?.line;
  return typeof dataLine === "number" ? dataLine : 0;
}

function processChildren(
  children: HastRoot["children"],
  nodeIndex: { value: number }
): HastRoot["children"] {
  return children.map((child) => {
    if (child.type !== "element") return child;
    const el = child as Element;
    if (BLOCK_ELEMENTS.has(el.tagName)) {
      const sourceLine = getSourceLine(el);
      const idx = nodeIndex.value++;
      return {
        ...el,
        properties: {
          ...el.properties,
          "data-node-id": `${sourceLine}:${idx}`,
        },
        children: processChildren(el.children, nodeIndex) as Element["children"],
      };
    }
    return {
      ...el,
      children: processChildren(el.children, nodeIndex) as Element["children"],
    };
  });
}

export function injectNodeIds(hast: HastRoot): HastRoot {
  const nodeIndex = { value: 0 };
  return {
    ...hast,
    children: processChildren(hast.children, nodeIndex),
  };
}
