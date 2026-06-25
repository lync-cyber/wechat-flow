import type { TemplateDefinition } from "@wechat-flow/contracts";
import { markdown } from "./starter.generated.ts";

export const templates: TemplateDefinition[] = [
  {
    themeId: "magazine",
    templateId: "starter",
    markdown,
    metadata: { description: "杂志风格入门模板" },
  },
];
