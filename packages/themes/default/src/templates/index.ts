import type { TemplateDefinition } from "@wechat-flow/contracts";
import { markdown as listicleMarkdown } from "./listicle.generated.ts";
import { markdown as starterMarkdown } from "./starter.generated.ts";

export const templates: TemplateDefinition[] = [
  {
    themeId: "default",
    templateId: "starter",
    markdown: starterMarkdown,
    metadata: { description: "简约通用入门模板" },
  },
  {
    themeId: "default",
    templateId: "listicle",
    markdown: listicleMarkdown,
    metadata: { description: "列表式干货文章" },
  },
];
