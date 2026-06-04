import type { Root as MdastRoot } from "mdast";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

export function parseMarkdown(input: string): MdastRoot {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkDirective);
  return processor.parse(input);
}
