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

      if (name === "quote" && (variant === "large-quote-mark" || variant === "dropcap")) {
        (directive.data.hProperties as Record<string, unknown>)["data-quote-decoration"] = variant;
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
    properties: { "data-block-slot": "quote-mark" },
    children: [{ type: "text", value: "「" }],
  };

  const author: Element = {
    type: "element",
    tagName: "div",
    properties: { "data-block-slot": "author" },
    children: [{ type: "text", value: authorText }],
  };

  return [quoteMark, author];
}

function buildQuoteMarkDecoration(): Element {
  return {
    type: "element",
    tagName: "span",
    properties: { "data-block-slot": "quote-mark" },
    children: [{ type: "text", value: '"' }],
  };
}

function extractFirstChar(children: Element["children"]): {
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

function injectDropcapDecoration(node: Element): Element {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.type === "element") {
      const paragraph = child as Element;
      const extracted = extractFirstChar(paragraph.children);
      if (extracted) {
        const dropcapSpan: Element = {
          type: "element",
          tagName: "span",
          properties: { "data-block-slot": "dropcap" },
          children: [{ type: "text", value: extracted.firstChar }],
        };
        const newParagraph: Element = {
          ...paragraph,
          children: [dropcapSpan, ...extracted.rest],
        };
        const newChildren = [...node.children];
        newChildren[i] = newParagraph;
        return { ...node, children: newChildren };
      }
    }
  }
  return node;
}

function textContentOf(children: Element["children"]): string {
  return children
    .map((child) => {
      if (child.type === "text") return child.value;
      if (child.type === "element") return textContentOf(child.children);
      return "";
    })
    .join("");
}

function buildStepCard(listItem: Element, isLast: boolean): Element {
  const paragraph = listItem.children.find(
    (child): child is Element => child.type === "element" && child.tagName === "p"
  );
  const paragraphChildren = paragraph?.children ?? listItem.children;

  const strongChild = paragraphChildren.find(
    (child): child is Element => child.type === "element" && child.tagName === "strong"
  );

  const title = strongChild
    ? textContentOf(strongChild.children)
    : textContentOf(paragraphChildren);
  const afterStrong = strongChild
    ? paragraphChildren.slice(paragraphChildren.indexOf(strongChild) + 1)
    : [];
  const description = textContentOf(afterStrong).replace(/^[：:，,\s]+/, "");

  const titleEl: Element = {
    type: "element",
    tagName: "div",
    properties: { "data-block-slot": "title" },
    children: [{ type: "text", value: title }],
  };

  const cardChildren: Element[] = [titleEl];
  if (description.length > 0) {
    const descriptionEl: Element = {
      type: "element",
      tagName: "div",
      properties: { "data-block-slot": "description" },
      children: [{ type: "text", value: description }],
    };
    cardChildren.push(descriptionEl);
  }

  const properties: Element["properties"] = {
    "data-block": "steps",
    "data-variant": "card",
    "data-steps-item": "card",
  };
  if (isLast) {
    properties["data-block-slot-last"] = "true";
  }

  return {
    type: "element",
    tagName: "div",
    properties,
    children: cardChildren,
  };
}

function buildStepsCardList(ul: Element): Element[] {
  const listItems = ul.children.filter(
    (child): child is Element => child.type === "element" && child.tagName === "li"
  );
  return listItems.map((li, index) => buildStepCard(li, index === listItems.length - 1));
}

function injectContainerDecorations(hast: HastRoot): HastRoot {
  function walk(node: Element): Element {
    const props = node.properties ?? {};
    const authorText = props["data-pull-quote-author"];
    const quoteDecoration = props["data-quote-decoration"];

    if (props["data-block"] === "steps" && props["data-variant"] === "card") {
      const ul = node.children.find(
        (child): child is Element => child.type === "element" && child.tagName === "ul"
      );
      if (ul) {
        const cards = buildStepsCardList(ul);
        const { "data-block": _block, "data-variant": _variant, ...restProps } = props;
        return { ...node, properties: restProps, children: cards };
      }
    }

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

    if (props["data-block"] === "quote" && quoteDecoration === "large-quote-mark") {
      const { "data-quote-decoration": _stash, ...restProps } = props;
      return {
        ...node,
        properties: restProps,
        children: [buildQuoteMarkDecoration(), ...newChildren],
      };
    }

    if (props["data-block"] === "quote" && quoteDecoration === "dropcap") {
      const { "data-quote-decoration": _stash, ...restProps } = props;
      return injectDropcapDecoration({ ...node, properties: restProps, children: newChildren });
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
  return injectContainerDecorations(hast);
}
