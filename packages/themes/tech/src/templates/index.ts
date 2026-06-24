import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { TemplateDefinition } from "@wechat-flow/contracts";

const markdown = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../templates/starter.md"),
  "utf-8"
);

export const templates: TemplateDefinition[] = [
  {
    themeId: "tech",
    templateId: "starter",
    markdown,
    metadata: { description: "技术文档入门模板" },
  },
];
