import type { TemplateDefinition } from "@wechat-flow/contracts";
import { markdown as featureStoryMarkdown } from "./feature-story.generated.ts";
import { markdown as starterMarkdown } from "./starter.generated.ts";

export const templates: TemplateDefinition[] = [
  {
    themeId: "magazine",
    templateId: "starter",
    name: "杂志图文",
    markdown: starterMarkdown,
    metadata: { description: "杂志风格入门模板" },
  },
  {
    themeId: "magazine",
    templateId: "feature-story",
    name: "封面专题",
    markdown: featureStoryMarkdown,
    metadata: { description: "特别策划专题报道" },
  },
];
