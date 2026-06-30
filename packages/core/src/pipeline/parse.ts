import type { Root as MdastRoot } from "mdast";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkDirective).freeze();

export function parseMarkdown(input: string): MdastRoot {
  return processor.parse(input);
}
