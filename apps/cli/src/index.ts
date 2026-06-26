#!/usr/bin/env node
import process from "node:process";
import { Command } from "commander";
import { runInit } from "./commands/init.ts";
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

program.parse(process.argv);
