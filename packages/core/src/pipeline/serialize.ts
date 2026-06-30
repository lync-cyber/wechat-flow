import type { Root as HastRoot } from "hast";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";

const processor = unified().use(rehypeStringify).freeze();

export function serializeHast(hast: HastRoot): string {
  return processor.stringify(hast);
}
