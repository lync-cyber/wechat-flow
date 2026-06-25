import type { TemplateDefinition } from "@wechat-flow/contracts";
import { markdown } from "./starter.generated.ts";

export const templates: TemplateDefinition[] = [
  {
    themeId: "literary",
    templateId: "starter",
    markdown,
    metadata: { description: "文学风格入门模板" },
  },
];
