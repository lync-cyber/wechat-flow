import type { TemplateDefinition } from "@wechat-flow/contracts";
import { markdown as starterMarkdown } from "./starter.generated.ts";
import { markdown as tutorialMarkdown } from "./tutorial.generated.ts";

export const templates: TemplateDefinition[] = [
  {
    themeId: "tech",
    templateId: "starter",
    markdown: starterMarkdown,
    metadata: { description: "技术文档入门模板" },
  },
  {
    themeId: "tech",
    templateId: "tutorial",
    markdown: tutorialMarkdown,
    metadata: { description: "实战搭建教程" },
  },
];
