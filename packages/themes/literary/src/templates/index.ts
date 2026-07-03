import type { TemplateDefinition } from "@wechat-flow/contracts";
import { markdown as essayMarkdown } from "./essay.generated.ts";
import { markdown as starterMarkdown } from "./starter.generated.ts";

export const templates: TemplateDefinition[] = [
  {
    themeId: "literary",
    templateId: "starter",
    name: "文艺图文",
    markdown: starterMarkdown,
    metadata: { description: "文学风格入门模板" },
  },
  {
    themeId: "literary",
    templateId: "essay",
    name: "随笔长文",
    markdown: essayMarkdown,
    metadata: { description: "旅途散文随笔" },
  },
];
