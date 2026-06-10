import type { Element, Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { toHtml } from "hast-util-to-html";
import type { NodeDiff } from "./diff/per-node-diff.ts";
import { diffNodes } from "./diff/per-node-diff.ts";
import { rewriteStructure } from "./simulator/rewrite-structure.ts";
import type { DroppedAttr } from "./simulator/strip-attrs.ts";
import { stripAttrs } from "./simulator/strip-attrs.ts";
import { stripTags } from "./simulator/strip-tags.ts";

export interface SimulatePasteResult {
  filteredHtml: string;
  nodeDiffs: NodeDiff[];
  droppedAttrs: DroppedAttr[];
}

function deepClone(tree: Root): Root {
  return JSON.parse(JSON.stringify(tree)) as Root;
}

function applyStripAttrs(tree: Root): { tree: Root; dropped: DroppedAttr[] } {
  const allDropped: DroppedAttr[] = [];
  let nodeIndex = 0;

  function walk(node: Root | Element): void {
    const children = node.children as Array<Root["children"][number]>;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.type !== "element") continue;
      const el = child as Element;
      const { el: cleaned, dropped } = stripAttrs(el, nodeIndex++);
      children[i] = cleaned;
      allDropped.push(...dropped);
      walk(cleaned);
    }
  }

  walk(tree);
  return { tree, dropped: allDropped };
}

export function simulatePaste(html: string): SimulatePasteResult {
  const beforeTree = fromHtml(html, { fragment: true });

  const { stripped, tree: afterStrippedTags } = stripTags(deepClone(beforeTree));
  const { tree: afterAttrs, dropped } = applyStripAttrs(afterStrippedTags);
  const finalTree = rewriteStructure(afterAttrs);

  const filteredHtml = toHtml(finalTree as Root);

  const nodeDiffs = diffNodes(deepClone(beforeTree), deepClone(finalTree as Root), 100);

  const strippedTagDropped: DroppedAttr[] = stripped.map((s) => ({
    nodeSelector: s.tagName,
    attrName: "__tag__",
  }));

  return {
    filteredHtml,
    nodeDiffs,
    droppedAttrs: [...strippedTagDropped, ...dropped],
  };
}
