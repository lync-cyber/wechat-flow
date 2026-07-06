import type { Diagnostic } from "@wechat-flow/contracts";
import type { Element, Root as HastRoot } from "hast";
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
          const detail = parsed.error.issues
            .map((issue) => {
              const field = issue.path.map((segment) => String(segment)).join(".");
              const prefix = field ? `${field} ` : "";
              if (issue.code === "invalid_type") return `${prefix}应为 ${issue.expected}`;
              if (issue.code === "unrecognized_keys") return `含未知属性 ${issue.keys.join("、")}`;
              return `${prefix}${issue.message}`;
            })
            .join("；");
          diagnostics?.push({
            source: "transform",
            severity: "warning",
            ruleId: "directive-attrs-invalid",
            message: `${name} 指令属性无效：${detail}`,
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

      if (name === "pull-quote" && variant === "decorated") {
        const author = directive.attributes?.author;
        if (typeof author === "string" && author.trim() !== "") {
          (directive.data.hProperties as Record<string, unknown>)["data-pull-quote-author"] =
            author;
        }
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

const rehypeProcessor = unified().use(remarkRehype, { allowDangerousHtml: false }).freeze();

function buildPullQuoteDecoration(authorText: string): [quoteMark: Element, author: Element] {
  const quoteMark: Element = {
    type: "element",
    tagName: "span",
    properties: { "data-pull-quote-slot": "quote-mark" },
    children: [{ type: "text", value: "「" }],
  };

  const author: Element = {
    type: "element",
    tagName: "div",
    properties: { "data-pull-quote-slot": "author" },
    children: [{ type: "text", value: authorText }],
  };

  return [quoteMark, author];
}

function injectPullQuoteDecorations(hast: HastRoot): HastRoot {
  function walk(node: Element): Element {
    const props = node.properties ?? {};
    const authorText = props["data-pull-quote-author"];
    const newChildren = node.children.map((child) =>
      child.type === "element" ? walk(child as Element) : child
    );

    if (
      props["data-block"] === "pull-quote" &&
      props["data-variant"] === "decorated" &&
      typeof authorText === "string"
    ) {
      const [quoteMark, author] = buildPullQuoteDecoration(authorText);
      const { "data-pull-quote-author": _stash, ...restProps } = props;
      return {
        ...node,
        properties: restProps,
        children: [quoteMark, ...newChildren, author],
      };
    }

    return { ...node, children: newChildren };
  }

  return {
    ...hast,
    children: hast.children.map((child) =>
      child.type === "element" ? walk(child as Element) : child
    ),
  };
}

export function transformToHast(mdast: MdastRoot, diagnostics?: Diagnostic[]): HastRoot {
  visitTextDirectives(mdast);
  visitContainerDirectives(mdast, diagnostics);
  const hast = rehypeProcessor.runSync(mdast) as HastRoot;
  return injectPullQuoteDecorations(hast);
}
