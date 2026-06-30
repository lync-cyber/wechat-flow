import type { Diagnostic } from "@wechat-flow/contracts";
import type { Element, Node, Parent } from "hast";
import type { RuleDefinition } from "../registry.ts";

const MAX_PARAGRAPH_CHARS = 500;

function collectText(node: Node): string {
  if (node.type === "text") {
    return (node as { type: "text"; value: string }).value;
  }
  if ("children" in node) {
    return (node as Parent).children.map(collectText).join("");
  }
  return "";
}

function getParagraphLength(node: Node): number | null {
  const el = node as Element;
  if (el.type !== "element" || el.tagName !== "p") return null;
  const text = collectText(node);
  return [...text].length;
}

const readabilityParagraphLength: RuleDefinition = {
  id: "readability-paragraph-length",
  scope: "lint",
  priority: 30,
  matcher: (node: Node): boolean => {
    const len = getParagraphLength(node);
    return len !== null && len > MAX_PARAGRAPH_CHARS;
  },
  transform: (node: Node): Node => node,
  diagnose: (node: Node): Diagnostic[] => {
    const len = getParagraphLength(node);
    if (len === null) return [];
    return [
      {
        severity: "info",
        ruleId: "readability-paragraph-length",
        message: `paragraph length: ${len} chars > max ${MAX_PARAGRAPH_CHARS}`,
      },
    ];
  },
};

export default readabilityParagraphLength;
