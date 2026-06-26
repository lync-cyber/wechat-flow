import * as fs from "node:fs";
import * as path from "node:path";
import { renderMarkdown } from "@wechat-flow/core";
import { registerBuiltins } from "../bootstrap.ts";

export interface ExportOptions {
  input: string;
  format: string;
  output?: string;
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runExport(opts: ExportOptions): Promise<CommandResult> {
  registerBuiltins();

  if (opts.format !== "html") {
    return { exitCode: 1, stdout: "", stderr: `Unsupported format: ${opts.format}` };
  }

  let markdown: string;
  try {
    markdown = fs.readFileSync(opts.input, "utf-8");
  } catch {
    return { exitCode: 1, stdout: "", stderr: `Cannot read file: ${opts.input}` };
  }

  let html: string;
  try {
    const result = await renderMarkdown(markdown, { themeId: "default" });
    html = result.html;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { exitCode: 1, stdout: "", stderr: `Render error: ${message}` };
  }

  const outputPath =
    opts.output ??
    path.join(
      path.dirname(opts.input),
      `${path.basename(opts.input, path.extname(opts.input))}.html`
    );

  const standalone = `<!DOCTYPE html>\n<html>\n<body>\n${html}\n</body>\n</html>\n`;
  try {
    fs.writeFileSync(outputPath, standalone, "utf-8");
  } catch {
    return { exitCode: 1, stdout: "", stderr: `Cannot write file: ${outputPath}` };
  }

  return { exitCode: 0, stdout: `Exported to ${outputPath}`, stderr: "" };
}
