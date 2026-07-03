import type { TemplateDefinition } from "@wechat-flow/contracts";
import { markdown as caseStudyMarkdown } from "./case-study.generated.ts";
import { markdown as starterMarkdown } from "./starter.generated.ts";

export const templates: TemplateDefinition[] = [
  {
    themeId: "business",
    templateId: "starter",
    name: "商务图文",
    markdown: starterMarkdown,
    metadata: { description: "商务风格入门模板" },
  },
  {
    themeId: "business",
    templateId: "case-study",
    name: "案例研究",
    markdown: caseStudyMarkdown,
    metadata: { description: "品牌增长案例分析" },
  },
];
