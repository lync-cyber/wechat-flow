import type { Root as MdastRoot, YAML } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { parse as parseYaml } from "yaml";

export interface FrontmatterMeta {
  theme?: string;
  paint?: Record<string, string>;
  "base-color"?: string;
  [key: string]: unknown;
}

export interface FrontmatterResult {
  content: string;
  meta: FrontmatterMeta;
}

export function parseFrontmatter(markdown: string): FrontmatterResult {
  const processor = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]);
  const tree = processor.parse(markdown) as MdastRoot;

  const yamlNode = tree.children.find((n) => n.type === "yaml") as YAML | undefined;
  if (!yamlNode) {
    return { content: markdown, meta: {} };
  }

  const meta = (parseYaml(yamlNode.value) ?? {}) as FrontmatterMeta;

  // Strip the YAML front matter block from the source text
  const content = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");

  return { content, meta };
}
