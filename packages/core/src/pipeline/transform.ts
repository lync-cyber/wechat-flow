import type { Root as HastRoot } from "hast";
import type { Root as MdastRoot, Node } from "mdast";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { describeMark } from "../registry/mark.ts";
import type { RenderOptions } from "../types.ts";

interface DirectiveNode extends Node {
  type: "textDirective";
  name: string;
  attributes?: Record<string, string>;
  data?: Record<string, unknown>;
  children?: Node[];
}

function visitTextDirectives(tree: MdastRoot): void {
  function walk(node: Node): void {
    if (node.type === "textDirective") {
      const directive = node as DirectiveNode;
      const mark = describeMark(directive.name);
      directive.data = directive.data ?? {};
      directive.data.hName = "span";
      if (mark) {
        directive.data.hProperties = { style: mark.style };
      } else {
        directive.data.hProperties = {};
      }
    }
    const parent = node as { children?: Node[] };
    if (parent.children) {
      for (const child of parent.children) {
        walk(child);
      }
    }
  }
  walk(tree);
}

export function transformToHast(mdast: MdastRoot, _options?: RenderOptions): HastRoot {
  visitTextDirectives(mdast);
  const processor = unified().use(remarkRehype, { allowDangerousHtml: false });
  return processor.runSync(mdast) as HastRoot;
}
