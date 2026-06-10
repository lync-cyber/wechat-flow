import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";

function hasQuotedDataUri(node: Node): boolean {
  const el = node as Element;
  if (el.type !== "element") return false;
  const style = el.properties?.style;
  if (typeof style !== "string") return false;
  return /url\s*\(\s*['"]data:/.test(style);
}

function unquoteDataUrisInStyle(style: string): string {
  return style.replace(/url\s*\(\s*(['"])(data:[^'"]+)\1\s*\)/g, "url($2)");
}

const transformDataUriUnquote: RuleDefinition = {
  id: "transform-data-uri-unquote",
  scope: "transform",
  priority: 60,
  matcher: hasQuotedDataUri,
  transform: (node: Node): Node => {
    const el = node as Element;
    const style = el.properties?.style as string;
    const newStyle = unquoteDataUrisInStyle(style);
    return { ...el, properties: { ...el.properties, style: newStyle } } as unknown as Node;
  },
};

export default transformDataUriUnquote;
