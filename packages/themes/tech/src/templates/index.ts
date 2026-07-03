import type { TemplateDefinition } from "@wechat-flow/contracts";
import { markdown as starterMarkdown } from "./starter.generated.ts";
import { markdown as tutorialMarkdown } from "./tutorial.generated.ts";

export const templates: TemplateDefinition[] = [
  {
    themeId: "tech",
    templateId: "starter",
    name: "技术文档",
    markdown: starterMarkdown,
    metadata: { description: "技术文档入门模板" },
  },
  {
    themeId: "tech",
    templateId: "tutorial",
    name: "实战教程",
    markdown: tutorialMarkdown,
    metadata: { description: "实战搭建教程" },
  },
];
