import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineTemplate } from "@wechat-flow/core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const markdown = readFileSync(join(__dirname, "../../templates/starter.md"), "utf-8");

defineTemplate({
  themeId: "tech",
  templateId: "starter",
  markdown,
  metadata: { description: "技术文档入门模板" },
});
