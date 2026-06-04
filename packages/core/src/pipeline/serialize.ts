import type { Root as HastRoot } from "hast";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";

export function serializeHast(hast: HastRoot): string {
  const processor = unified().use(rehypeStringify);
  return processor.stringify(hast);
}
