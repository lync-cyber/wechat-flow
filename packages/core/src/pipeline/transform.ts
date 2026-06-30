import type { Diagnostic } from "@wechat-flow/contracts";
import type { Root as HastRoot } from "hast";
import type { Root as MdastRoot, Node } from "mdast";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { describeBlock } from "../registry/block.ts";
import { describeMark } from "../registry/mark.ts";

interface DirectiveNode extends Node {
  type: "textDirective" | "containerDirective" | "leafDirective";
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

function visitContainerDirectives(tree: MdastRoot, diagnostics: Diagnostic[] | undefined): void {
  function walk(node: Node): void {
    if (node.type === "containerDirective" || node.type === "leafDirective") {
      const directive = node as DirectiveNode;
      const name = directive.name;
      const rawClass = (directive.attributes?.class ?? "").trim();
      const variant = rawClass.split(/\s+/)[0] || "default";

      const block = describeBlock(name);
      if (block) {
        const { class: _cls, ...rest } = directive.attributes ?? {};
        const parsed = block.attrsSchema.safeParse(rest);
        if (!parsed.success) {
          diagnostics?.push({
            source: "transform",
            severity: "warning",
            ruleId: "directive-attrs-invalid",
            message: `block '${name}' directive attributes invalid: ${parsed.error.message}`,
          });
        }
      }

      directive.data = directive.data ?? {};
      directive.data.hName = "div";
      directive.data.hProperties = {
        ...((directive.data.hProperties as Record<string, unknown>) ?? {}),
        "data-block": name,
        "data-variant": variant,
      };
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

const rehypeProcessor = unified().use(remarkRehype, { allowDangerousHtml: false }).freeze();

export function transformToHast(mdast: MdastRoot, diagnostics?: Diagnostic[]): HastRoot {
  visitTextDirectives(mdast);
  visitContainerDirectives(mdast, diagnostics);
  return rehypeProcessor.runSync(mdast) as HastRoot;
}
