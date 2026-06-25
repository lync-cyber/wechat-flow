import type { TemplateDefinition } from "@wechat-flow/contracts";
import { markdown } from "./starter.generated.ts";

export const templates: TemplateDefinition[] = [
  {
    themeId: "business",
    templateId: "starter",
    markdown,
    metadata: { description: "商务风格入门模板" },
  },
];
