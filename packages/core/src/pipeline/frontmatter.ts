import type { Root as MdastRoot, YAML } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

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

export function upsertFrontmatterPaint(markdown: string, paint: Record<string, string>): string {
  const { content, meta } = parseFrontmatter(markdown);
  const { paint: _dropped, ...rest } = meta;
  const next: FrontmatterMeta = Object.keys(paint).length === 0 ? rest : { ...rest, paint };
  if (Object.keys(next).length === 0) {
    return content;
  }
  return `---\n${stringifyYaml(next).trimEnd()}\n---\n${content}`;
}
