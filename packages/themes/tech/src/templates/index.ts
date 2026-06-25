import type { TemplateDefinition } from "@wechat-flow/contracts";
import { markdown } from "./starter.generated.ts";

export const templates: TemplateDefinition[] = [
  {
    themeId: "tech",
    templateId: "starter",
    markdown,
    metadata: { description: "技术文档入门模板" },
  },
];
