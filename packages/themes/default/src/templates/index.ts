import type { TemplateDefinition } from "@wechat-flow/contracts";
import { markdown } from "./starter.generated.ts";

export const templates: TemplateDefinition[] = [
  {
    themeId: "default",
    templateId: "starter",
    markdown,
    metadata: { description: "简约通用入门模板" },
  },
];
