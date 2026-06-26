import type { TemplateDefinition } from "@wechat-flow/contracts";
import { markdown as caseStudyMarkdown } from "./case-study.generated.ts";
import { markdown as starterMarkdown } from "./starter.generated.ts";

export const templates: TemplateDefinition[] = [
  {
    themeId: "business",
    templateId: "starter",
    markdown: starterMarkdown,
    metadata: { description: "商务风格入门模板" },
  },
  {
    themeId: "business",
    templateId: "case-study",
    markdown: caseStudyMarkdown,
    metadata: { description: "品牌增长案例分析" },
  },
];
