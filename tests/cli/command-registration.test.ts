import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const src = fs.readFileSync(path.resolve(process.cwd(), "apps/cli/src/index.ts"), "utf-8");

describe("CLI 命令注册静态守卫 — 防止误删注册行（T-116 AC-004）", () => {
  it('源码包含 .command("init") 注册调用', () => {
    expect(src).toContain('.command("init');
  });

  it('源码包含 .command("validate") 注册调用', () => {
    expect(src).toContain('.command("validate');
  });

  it('源码包含 .command("dev") 注册调用', () => {
    expect(src).toContain('.command("dev');
  });

  it("dev 命令 action 将 packDir 传入 runDev（wiring 守卫）", () => {
    expect(src).toContain("runDev({ packDir");
  });
});
