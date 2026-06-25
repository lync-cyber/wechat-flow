import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const themesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "packages", "themes");

function generate() {
  let count = 0;
  for (const theme of readdirSync(themesDir)) {
    const templatesDir = join(themesDir, theme, "templates");
    if (!existsSync(templatesDir)) continue;
    for (const file of readdirSync(templatesDir).filter((f) => f.endsWith(".md"))) {
      const markdown = readFileSync(join(templatesDir, file), "utf-8");
      const base = file.replace(/\.md$/, "");
      const out = join(themesDir, theme, "src", "templates", `${base}.generated.ts`);
      const header = `// Generated from templates/${file} by scripts/gen-theme-templates.mjs — do not edit.`;
      writeFileSync(out, `${header}\nexport const markdown = ${JSON.stringify(markdown)};\n`);
      count++;
    }
  }
  return count;
}

const count = generate();
console.log(`gen-theme-templates: wrote ${count} module(s)`);
