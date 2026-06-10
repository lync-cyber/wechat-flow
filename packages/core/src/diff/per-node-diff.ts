import type { Element, Root } from "hast";
import { toHtml } from "hast-util-to-html";

export interface NodeDiff {
  nodeSelector: string;
  before: string;
  after: string;
}

function elementToHtml(el: Element): string {
  const fragment: Root = { type: "root", children: [el] };
  return toHtml(fragment);
}

function buildSelector(el: Element, index: number): string {
  return `${el.tagName}:nth(${index})`;
}

export function diffNodes(before: Root, after: Root, limit: number): NodeDiff[] {
  const diffs: NodeDiff[] = [];

  function collectElements(tree: Root | Element): Element[] {
    const elements: Element[] = [];
    function walk(node: Root | Element): void {
      if (node.type === "element") {
        elements.push(node as Element);
      }
      for (const child of node.children) {
        if (child.type === "element") {
          walk(child);
        }
      }
    }
    walk(tree);
    return elements;
  }

  const beforeEls = collectElements(before).slice(0, limit);
  const afterEls = collectElements(after).slice(0, limit);

  const count = Math.min(beforeEls.length, afterEls.length);
  for (let i = 0; i < count; i++) {
    const b = beforeEls[i];
    const a = afterEls[i];
    const bHtml = elementToHtml(b);
    const aHtml = elementToHtml(a);
    if (bHtml !== aHtml) {
      diffs.push({
        nodeSelector: buildSelector(b, i),
        before: bHtml,
        after: aHtml,
      });
    }
  }

  return diffs;
}
