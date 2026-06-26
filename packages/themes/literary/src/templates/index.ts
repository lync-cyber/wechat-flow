import type { TemplateDefinition } from "@wechat-flow/contracts";
import { markdown as essayMarkdown } from "./essay.generated.ts";
import { markdown as starterMarkdown } from "./starter.generated.ts";

export const templates: TemplateDefinition[] = [
  {
    themeId: "literary",
    templateId: "starter",
    markdown: starterMarkdown,
    metadata: { description: "文学风格入门模板" },
  },
  {
    themeId: "literary",
    templateId: "essay",
    markdown: essayMarkdown,
    metadata: { description: "旅途散文随笔" },
  },
];
