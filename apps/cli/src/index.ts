#!/usr/bin/env node
import process from "node:process";
import { Command } from "commander";
import { runCopy } from "./commands/copy.ts";
import { runDev } from "./commands/dev.ts";
import { runExport } from "./commands/export.ts";
import { runInit } from "./commands/init.ts";
import { runPublish } from "./commands/publish.ts";
import { runRender } from "./commands/render.ts";
import { runValidate } from "./commands/validate.ts";

const program = new Command();

program
  .name("wechat-flow")
  .description("WeChat Flow CLI — scaffold and validate plugin/theme packs")
  .version("0.0.0");

program
  .command("init <name>")
  .description("Scaffold a new plugin or theme pack")
  .option("-t, --template <template>", "Pack template: plugin or theme", "plugin")
  .action((name: string, opts: { template: string }) => {
    const template = opts.template === "theme" ? "theme" : "plugin";
    const result = runInit(name, { template });
    console.log(`Created ${result.createdDir}`);
    for (const f of result.files) {
      console.log(`  ${f}`);
    }
  });

program
  .command("validate <packDir>")
  .description("Validate a plugin or theme pack manifest")
  .action((packDir: string) => {
    const result = runValidate(packDir);
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    process.exitCode = result.exitCode;
  });

program
  .command("dev <packDir>")
  .description("Start local dev watch mode for a pack")
  .action((packDir: string) => {
    runDev({ packDir });
  });

program
  .command("publish <packDir>")
  .description("Detect and publish a new pack version")
  .action((packDir: string) => {
    const result = runPublish({ packDir });
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    process.exitCode = result.exitCode;
  });

program
  .command("render")
  .description("Render a Markdown file to inline-styled HTML")
  .requiredOption("--input <file>", "Input Markdown file")
  .option("--theme <themeId>", "Theme ID", "default")
  .action(async (opts: { input: string; theme: string }) => {
    const result = await runRender({ input: opts.input, theme: opts.theme });
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    process.exitCode = result.exitCode;
  });

program
  .command("copy")
  .description("Render Markdown and produce a paste-ready payload")
  .requiredOption("--input <file>", "Input Markdown file")
  .option("--theme <themeId>", "Theme ID", "default")
  .action(async (opts: { input: string; theme: string }) => {
    const result = await runCopy({ input: opts.input, theme: opts.theme });
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    process.exitCode = result.exitCode;
  });

program
  .command("export")
  .description("Export rendered HTML as a standalone file")
  .requiredOption("--input <file>", "Input Markdown file")
  .option("--format <format>", "Export format", "html")
  .option("--output <file>", "Output file path")
  .action(async (opts: { input: string; format: string; output?: string }) => {
    const result = await runExport({ input: opts.input, format: opts.format, output: opts.output });
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    process.exitCode = result.exitCode;
  });

program.parse(process.argv);
