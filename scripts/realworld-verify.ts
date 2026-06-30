import { appendFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import "../packages/blocks/src/index.ts";
import "../packages/marks/src/index.ts";
import { registerTheme, renderMarkdown, simulatePaste } from "../packages/core/src/index.ts";
import businessTheme from "../packages/themes/business/src/index.ts";
import defaultTheme from "../packages/themes/default/src/index.ts";
import literaryTheme from "../packages/themes/literary/src/index.ts";
import magazineTheme from "../packages/themes/magazine/src/index.ts";
import techTheme from "../packages/themes/tech/src/index.ts";

const THEMES = [defaultTheme, businessTheme, literaryTheme, magazineTheme, techTheme];

export interface RealworldVerifyOpts {
  outDir: string;
  eventLogPath: string;
  samplesDir?: string;
  themeFilter?: string;
  sampleFilter?: string;
}

export interface RenderEntry {
  theme: string;
  sample: string;
  outPath: string;
}

export interface RealworldVerifyResult {
  rendered: RenderEntry[];
  eventsAppended: number;
}

let themesRegistered = false;

function ensureThemesRegistered(): void {
  if (themesRegistered) return;
  for (const theme of THEMES) {
    registerTheme(theme);
  }
  themesRegistered = true;
}

export async function runRealworldVerify(
  opts: RealworldVerifyOpts
): Promise<RealworldVerifyResult> {
  const { outDir, eventLogPath, samplesDir, themeFilter, sampleFilter } = opts;

  ensureThemesRegistered();

  const resolvedSamplesDir =
    samplesDir ?? join(dirname(fileURLToPath(import.meta.url)), "../tests/realworld/samples");

  const allSampleFiles = readdirSync(resolvedSamplesDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const sampleFiles = sampleFilter
    ? allSampleFiles.filter((f) => f.replace(/\.md$/, "") === sampleFilter)
    : allSampleFiles;

  const themes = themeFilter ? THEMES.filter((t) => t.id === themeFilter) : THEMES;

  const rendered: RenderEntry[] = [];
  let eventsAppended = 0;

  for (const theme of themes) {
    const themeOutDir = join(outDir, theme.id);
    mkdirSync(themeOutDir, { recursive: true });

    for (const sampleFile of sampleFiles) {
      const sampleName = sampleFile.replace(/\.md$/, "");
      const samplePath = join(resolvedSamplesDir, sampleFile);
      const markdown = readFileSync(samplePath, "utf8");

      const { html } = await renderMarkdown(markdown, { themeId: theme.id });
      const { filteredHtml, droppedAttrs } = simulatePaste(html);

      const outPath = join(themeOutDir, `${sampleName}.html`);

      const page = buildComparePage(theme.id, sampleName, html, filteredHtml, droppedAttrs);
      writeFileSync(outPath, page, "utf8");

      rendered.push({ theme: theme.id, sample: sampleName, outPath });

      const droppedCount = droppedAttrs.length;
      const detail = `realworld_verify ${theme.id}/${sampleName}: ${droppedCount} attrs dropped on paste, ${droppedAttrs.map((d) => d.attrName).join(",")}`;

      const record: Record<string, string> = {
        ts: new Date().toISOString(),
        event: "state_change",
        phase: "development",
        ref: outPath,
        detail,
      };

      appendFileSync(eventLogPath, `${JSON.stringify(record)}\n`, "utf8");
      eventsAppended++;
    }
  }

  return { rendered, eventsAppended };
}

function buildComparePage(
  theme: string,
  sample: string,
  renderedHtml: string,
  pastedHtml: string,
  droppedAttrs: Array<{ attrName: string }>
): string {
  const templatePath = join(
    dirname(fileURLToPath(import.meta.url)),
    "../tests/realworld/expected-template.html"
  );
  let template = readFileSync(templatePath, "utf8");

  const droppedList =
    droppedAttrs.length > 0 ? droppedAttrs.map((d) => d.attrName).join(", ") : "(none)";

  template = template
    .replace(/\{\{THEME\}\}/g, theme)
    .replace(/\{\{SAMPLE\}\}/g, sample)
    .replace(/\{\{GENERATED_AT\}\}/g, new Date().toISOString())
    .replace(/\{\{RULE_COUNT\}\}/g, "n/a")
    .replace(/\{\{DROPPED_COUNT\}\}/g, String(droppedAttrs.length))
    .replace(/\{\{RENDERED_HTML\}\}/g, renderedHtml)
    .replace(/\{\{PASTED_HTML\}\}/g, pastedHtml)
    .replace(/\{\{RENDERED_BYTES\}\}/g, String(Buffer.byteLength(renderedHtml, "utf8")))
    .replace(/\{\{DROPPED_ATTRS\}\}/g, droppedList);

  return template;
}

// CLI guard — only runs when executed directly via `node scripts/realworld-verify.ts`
const isMain =
  typeof process !== "undefined" &&
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith("realworld-verify.ts") ||
    process.argv[1].endsWith("realworld-verify.js"));

if (isMain) {
  const args = process.argv.slice(2);
  const themeIdx = args.indexOf("--theme");
  const sampleIdx = args.indexOf("--sample");

  const scriptDir = dirname(fileURLToPath(import.meta.url));

  runRealworldVerify({
    outDir: join(scriptDir, "../tests/realworld/output"),
    eventLogPath: join(scriptDir, "../docs/EVENT-LOG.jsonl"),
    samplesDir: join(scriptDir, "../tests/realworld/samples"),
    themeFilter: themeIdx >= 0 ? args[themeIdx + 1] : undefined,
    sampleFilter: sampleIdx >= 0 ? args[sampleIdx + 1] : undefined,
  }).then((result) => {
    console.log(
      `Done: ${result.rendered.length} files rendered, ${result.eventsAppended} events appended.`
    );
  });
}
