import type { Element, Root } from "hast";

const STRIPPED_TAGS = new Set(["style", "script"]);

export interface StrippedTag {
  tagName: string;
  outerHtml: string;
}

function walkChildren(node: Root | Element, stripped: StrippedTag[]): void {
  const children = node.children as Array<Root["children"][number]>;
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    if (child.type !== "element") continue;
    const el = child as Element;
    if (STRIPPED_TAGS.has(el.tagName)) {
      children.splice(i, 1);
      stripped.push({ tagName: el.tagName, outerHtml: `<${el.tagName}>` });
    } else {
      walkChildren(el, stripped);
    }
  }
}

export function stripTags(tree: Root): { tree: Root; stripped: StrippedTag[] } {
  const stripped: StrippedTag[] = [];
  walkChildren(tree, stripped);
  return { tree, stripped };
}
