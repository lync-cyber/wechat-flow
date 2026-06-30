import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const mcpRoot = fileURLToPath(new URL("../../apps/mcp-server", import.meta.url));

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(filePath, "utf-8")) as Record<string, unknown>;
}

function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectTsFiles(full));
    } else if (entry.endsWith(".ts")) {
      results.push(full);
    }
  }
  return results;
}

// MCP server 冷路径与 Playwright/BullMQ 解耦（经 JobsClient 边界），此守卫防回归。
describe("cold-start-guard: MCP server 冷路径无 Playwright/BullMQ 依赖（AC-003/004 精神）", () => {
  it("package.json dependencies+devDependencies 不含 playwright 或 bullmq", () => {
    const pkg = readJson(join(mcpRoot, "package.json"));
    const deps = {
      ...((pkg.dependencies as Record<string, string> | undefined) ?? {}),
      ...((pkg.devDependencies as Record<string, string> | undefined) ?? {}),
    };
    const keys = Object.keys(deps).map((k) => k.toLowerCase());
    expect(keys.some((k) => k.includes("playwright"))).toBe(false);
    expect(keys.some((k) => k.includes("bullmq"))).toBe(false);
  });

  it("src/**/*.ts 无 playwright 静态或动态 import 引用", () => {
    const srcDir = join(mcpRoot, "src");
    const files = collectTsFiles(srcDir);
    const playwrightPattern = /(?:from|import)\s*\(?["'`][^"'`]*playwright[^"'`]*["'`]/;
    const violations: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      if (playwrightPattern.test(content)) {
        violations.push(file);
      }
    }
    expect(violations).toHaveLength(0);
  });

  it("src/**/*.ts 无 bullmq 静态或动态 import 引用", () => {
    const srcDir = join(mcpRoot, "src");
    const files = collectTsFiles(srcDir);
    const bullmqPattern = /(?:from|import)\s*\(?["'`][^"'`]*bullmq[^"'`]*["'`]/;
    const violations: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      if (bullmqPattern.test(content)) {
        violations.push(file);
      }
    }
    expect(violations).toHaveLength(0);
  });
});
