import type { Element, Properties } from "hast";

export interface SlotElementOptions {
  inline?: boolean;
  props?: Properties;
}

export function slotElement(
  slot: string,
  children: Element["children"],
  opts?: SlotElementOptions
): Element {
  return {
    type: "element",
    tagName: opts?.inline ? "span" : "section",
    properties: {
      ...(opts?.props ?? {}),
      "data-block-slot": slot,
    },
    children,
  };
}

export function findList(element: Element): Element | undefined {
  return element.children.find(
    (child): child is Element => child.type === "element" && child.tagName === "ul"
  );
}

export function listItemsOf(list: Element): Element[] {
  return list.children.filter(
    (child): child is Element => child.type === "element" && child.tagName === "li"
  );
}

export function textContentOf(children: Element["children"]): string {
  return children
    .map((child) => {
      if (child.type === "text") return child.value;
      if (child.type === "element") return textContentOf(child.children);
      return "";
    })
    .join("");
}

export function extractFirstChar(children: Element["children"]): {
  firstChar: string;
  rest: Element["children"];
} | null {
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.type === "text" && child.value.length > 0) {
      const firstChar = child.value[0] as string;
      const restValue = child.value.slice(1);
      const rest = [...children];
      if (restValue.length > 0) {
        rest[i] = { ...child, value: restValue };
      } else {
        rest.splice(i, 1);
      }
      return { firstChar, rest };
    }
  }
  return null;
}

export function injectLeadingInlineNode(element: Element, node: Element): void {
  for (const child of element.children) {
    if (child.type === "element") {
      const paragraph = child as Element;
      paragraph.children = [node, ...paragraph.children];
      return;
    }
  }
}

export function injectDropcapMutation(element: Element): void {
  const children = element.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.type !== "element") continue;
    const paragraph = child as Element;
    const extracted = extractFirstChar(paragraph.children);
    if (!extracted) continue;

    const dropcapCell = slotElement("dropcap", [{ type: "text", value: extracted.firstChar }]);

    const bodyCell: Element = {
      ...paragraph,
      properties: {
        ...(paragraph.properties ?? {}),
        style: "display: table-cell; vertical-align: top",
      },
      children: extracted.rest,
    };

    const table = slotElement("dropcap-table", [dropcapCell, bodyCell]);

    children[i] = table;
    return;
  }
}
