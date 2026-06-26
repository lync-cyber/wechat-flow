import * as fs from "node:fs";
import { renderMarkdown } from "@wechat-flow/core";
import { registerBuiltins } from "../bootstrap.ts";

export interface RenderOptions {
  input: string;
  theme?: string;
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runRender(opts: RenderOptions): Promise<CommandResult> {
  registerBuiltins();

  let markdown: string;
  try {
    markdown = fs.readFileSync(opts.input, "utf-8");
  } catch {
    return { exitCode: 1, stdout: "", stderr: `Cannot read file: ${opts.input}` };
  }

  try {
    const result = await renderMarkdown(markdown, { themeId: opts.theme ?? "default" });
    return { exitCode: 0, stdout: result.html, stderr: "" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { exitCode: 1, stdout: "", stderr: `Render error: ${message}` };
  }
}
