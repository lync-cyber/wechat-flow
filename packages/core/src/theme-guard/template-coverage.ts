import type { Node } from "mdast";
import { parseMarkdown } from "../pipeline/parse.ts";
import { describeTemplate, listThemeTemplates } from "../registry/template.ts";
import type { CoverageReport } from "../registry/template.ts";

export type ThemeTemplateValidationResult = {
  pass: boolean;
  themeId: string;
  templates: { templateId: string; coverage: CoverageReport }[];
  failingTemplates: string[];
};

const NINE_REQUIRED = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "paragraph",
  "list",
  "blockquote",
  "link",
  "code",
  "hr",
  "image",
  "table",
];

const CORE_BLOCKS = ["callout", "card", "steps", "quote", "pull-quote", "compare"] as const;

const SIMPLE_NODE_ELEMENT: Record<string, string> = {
  paragraph: "paragraph",
  list: "list",
  blockquote: "blockquote",
  code: "code",
  thematicBreak: "hr",
  table: "table",
  link: "link",
  image: "image",
};

function collectNodes(root: Node): Node[] {
  const result: Node[] = [];
  function walk(node: Node): void {
    result.push(node);
    const parent = node as { children?: Node[] };
    if (parent.children) {
      for (const child of parent.children) walk(child);
    }
  }
  walk(root);
  return result;
}

export function validateTemplateCoverage(
  _themeId: string,
  _templateId: string,
  markdown: string
): CoverageReport {
  const mdast = parseMarkdown(markdown);
  const nodes = collectNodes(mdast);

  const coveredElementSet = new Set<string>();
  const coveredBlockSet = new Set<string>();

  for (const node of nodes) {
    const simpleElement = SIMPLE_NODE_ELEMENT[node.type];
    if (simpleElement) {
      coveredElementSet.add(simpleElement);
    } else if (node.type === "heading") {
      const { depth } = node as unknown as { depth: number };
      coveredElementSet.add(`h${depth}`);
    } else if (node.type === "containerDirective" || node.type === "leafDirective") {
      const { name } = node as unknown as { name: string };
      if ((CORE_BLOCKS as readonly string[]).includes(name)) {
        coveredBlockSet.add(name);
      }
    }
  }

  const coveredElements = NINE_REQUIRED.filter((e) => coveredElementSet.has(e));
  const missingElements = NINE_REQUIRED.filter((e) => !coveredElementSet.has(e));
  const coveredBlocks = (CORE_BLOCKS as readonly string[]).filter((b) => coveredBlockSet.has(b));
  const missingBlocks = (CORE_BLOCKS as readonly string[]).filter((b) => !coveredBlockSet.has(b));

  const pass = missingElements.length === 0 && missingBlocks.length === 0;

  return { pass, coveredElements, missingElements, coveredBlocks, missingBlocks };
}

export function validateThemeTemplates(themeId: string): ThemeTemplateValidationResult {
  const metas = listThemeTemplates(themeId);
  if (metas.length === 0) {
    return { pass: false, themeId, templates: [], failingTemplates: [] };
  }

  const templates: { templateId: string; coverage: CoverageReport }[] = [];
  const failingTemplates: string[] = [];

  for (const meta of metas) {
    const def = describeTemplate(themeId, meta.templateId);
    const coverage = validateTemplateCoverage(themeId, meta.templateId, def.markdown ?? "");
    templates.push({ templateId: meta.templateId, coverage });
    if (!coverage.pass) {
      failingTemplates.push(meta.templateId);
    }
  }

  const pass = failingTemplates.length === 0;
  return { pass, themeId, templates, failingTemplates };
}
