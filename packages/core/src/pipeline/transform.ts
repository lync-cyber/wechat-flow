import type { Root as HastRoot } from "hast";
import type { Root as MdastRoot } from "mdast";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import type { RenderOptions } from "../types.ts";

export function transformToHast(mdast: MdastRoot, _options?: RenderOptions): HastRoot {
  const processor = unified().use(remarkRehype, { allowDangerousHtml: false });
  return processor.runSync(mdast) as HastRoot;
}
