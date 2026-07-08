import type { Diagnostic } from "@wechat-flow/contracts";
import type { Element, Root as HastRoot } from "hast";
import type { Root as MdastRoot, Node } from "mdast";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { type BlockDefinition, describeBlock } from "../registry/block.ts";
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

function getDirectiveAttrShapeKeys(directiveAttrs: unknown): string[] {
  const shape = (directiveAttrs as { shape?: Record<string, unknown> } | undefined)?.shape;
  return shape ? Object.keys(shape) : [];
}

function locationOf(node: Node): { line: number; column: number } | undefined {
  const start = node.position?.start;
  return start ? { line: start.line, column: start.column } : undefined;
}

function buildAttrsInvalidMessage(
  name: string,
  allowedKeys: string[],
  issues: Array<{
    code: string;
    path: PropertyKey[];
    keys?: string[];
    expected?: string;
    message: string;
  }>
): string {
  const unrecognized = issues.find((issue) => issue.code === "unrecognized_keys");
  if (unrecognized?.keys) {
    const unknownKeys = unrecognized.keys.join("、");
    if (allowedKeys.length === 0) {
      return `${name} 指令不接受属性，但携带未声明属性 ${unknownKeys}`;
    }
    return `${name} 指令携带未声明属性 ${unknownKeys}，允许的属性为：${allowedKeys.join("、")}`;
  }
  const detail = issues
    .map((issue) => {
      const field = issue.path.map((segment) => String(segment)).join(".");
      const prefix = field ? `${field} ` : "";
      if (issue.code === "invalid_type") return `${prefix}应为 ${issue.expected}`;
      return `${prefix}${issue.message}`;
    })
    .join("；");
  return `${name} 指令属性无效：${detail}`;
}

function buildVariantInvalidMessage(
  name: string,
  variant: string,
  legalVariants: string[]
): string {
  return `${name} 指令变体 ${variant} 不合法，合法变体为：${legalVariants.join("、")}`;
}

function transferDeclaredAttrs(
  blockId: string,
  rawAttrs: Record<string, string>,
  allowedKeys: string[],
  hProperties: Record<string, unknown>
): void {
  for (const key of allowedKeys) {
    const value = rawAttrs[key];
    if (typeof value === "string" && value.trim() !== "") {
      hProperties[`data-${blockId}-${key}`] = value;
    }
  }
}

function visitContainerDirectives(tree: MdastRoot, diagnostics: Diagnostic[] | undefined): void {
  function walk(node: Node): void {
    if (node.type === "containerDirective" || node.type === "leafDirective") {
      const directive = node as DirectiveNode;
      const name = directive.name;
      const rawClass = (directive.attributes?.class ?? "").trim();
      const variant = rawClass.split(/\s+/)[0] || "default";
      const location = locationOf(directive);
      const { class: _cls, ...rest } = directive.attributes ?? {};

      const block = describeBlock(name);

      directive.data = directive.data ?? {};
      directive.data.hName = "section";
      const hProperties: Record<string, unknown> = {
        ...((directive.data.hProperties as Record<string, unknown>) ?? {}),
        "data-block": name,
        "data-variant": variant,
      };
      directive.data.hProperties = hProperties;

      if (block) {
        const allowedKeys = getDirectiveAttrShapeKeys(block.directiveAttrs);

        const parsed = block.directiveAttrs.safeParse(rest);
        if (!parsed.success) {
          diagnostics?.push({
            source: "transform",
            severity: "warning",
            ruleId: "directive-attrs-invalid",
            message: buildAttrsInvalidMessage(name, allowedKeys, parsed.error.issues),
            location,
          });
        }

        const legalVariants = block.variants.map((v) => v.id);
        if (!legalVariants.includes(variant)) {
          diagnostics?.push({
            source: "transform",
            severity: "warning",
            ruleId: "directive-variant-invalid",
            message: buildVariantInvalidMessage(name, variant, legalVariants),
            location,
          });
        }

        transferDeclaredAttrs(name, rest, allowedKeys, hProperties);
      }

      if (name === "quote" && (variant === "large-quote-mark" || variant === "dropcap")) {
        hProperties["data-quote-decoration"] = variant;
      }

      if (name === "paragraph" && variant === "dropcap") {
        hProperties["data-paragraph-decoration"] = variant;
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

function extractDeclaredAttrs(
  block: BlockDefinition,
  properties: Element["properties"]
): Record<string, string> {
  const shapeKeys = getDirectiveAttrShapeKeys(block.directiveAttrs);
  const attrs: Record<string, string> = {};
  for (const key of shapeKeys) {
    const value = properties[`data-${block.id}-${key}`];
    if (typeof value === "string") {
      attrs[key] = value;
    }
  }
  return attrs;
}

function dispatchBlockDecorations(hast: HastRoot): HastRoot {
  const docState: Record<string, unknown> = {};

  function walk(node: Element): Element {
    const newChildren = node.children.map((child) =>
      child.type === "element" ? walk(child as Element) : child
    );
    const decorated: Element = { ...node, children: newChildren };

    const blockId = decorated.properties?.["data-block"];
    if (typeof blockId === "string") {
      const block = describeBlock(blockId);
      if (block?.decorate) {
        const variant =
          typeof decorated.properties?.["data-variant"] === "string"
            ? (decorated.properties["data-variant"] as string)
            : "default";
        block.decorate(decorated, {
          variant,
          attrs: extractDeclaredAttrs(block, decorated.properties ?? {}),
          docState,
        });
      }
    }

    return decorated;
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
  return dispatchBlockDecorations(hast);
}
