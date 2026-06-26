import * as fs from "node:fs";
import { renderMarkdown, simulatePaste } from "@wechat-flow/core";
import { registerBuiltins } from "../bootstrap.ts";

export interface CopyOptions {
  input: string;
  theme?: string;
}

export interface CopyPayload {
  html: string;
  text: string;
}

export interface CopyResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  payload?: CopyPayload;
}

export async function runCopy(opts: CopyOptions): Promise<CopyResult> {
  registerBuiltins();

  let markdown: string;
  try {
    markdown = fs.readFileSync(opts.input, "utf-8");
  } catch {
    return { exitCode: 1, stdout: "", stderr: `Cannot read file: ${opts.input}` };
  }

  let html: string;
  try {
    const result = await renderMarkdown(markdown, { themeId: opts.theme ?? "default" });
    html = result.html;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { exitCode: 1, stdout: "", stderr: `Render error: ${message}` };
  }

  const pasteResult = simulatePaste(html);
  const payload: CopyPayload = {
    html: pasteResult.filteredHtml,
    text: pasteResult.filteredHtml.replace(/<[^>]+>/g, ""),
  };

  return {
    exitCode: 0,
    stdout: "Copy payload ready",
    stderr: "",
    payload,
  };
}
