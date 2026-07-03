import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

interface PackageJson {
  name: string;
  private?: boolean;
  engines?: { node?: string };
  bin?: string | Record<string, string>;
}

function readPackageJson(dir: string): PackageJson {
  return JSON.parse(readFileSync(join(dir, "package.json"), "utf-8")) as PackageJson;
}

function collectWorkspacePackageDirs(): string[] {
  const dirs: string[] = [];
  for (const group of ["packages", "apps"]) {
    for (const entry of readdirSync(join(repoRoot, group), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = join(repoRoot, group, entry.name);
      if (existsSync(join(dir, "package.json"))) {
        dirs.push(dir);
      } else if (group === "packages") {
        for (const nested of readdirSync(dir, { withFileTypes: true })) {
          if (!nested.isDirectory()) continue;
          const nestedDir = join(dir, nested.name);
          if (existsSync(join(nestedDir, "package.json"))) dirs.push(nestedDir);
        }
      }
    }
  }
  return dirs;
}

describe("npm distribution guardrails", () => {
  const packageDirs = collectWorkspacePackageDirs();
  const publishable = packageDirs.filter((dir) => readPackageJson(dir).private !== true);

  it("collects the publishable workspace package set", () => {
    expect(publishable.length).toBe(13);
  });

  it("every publishable package declares engines.node >=22 (deploy-spec consumer guardrail)", () => {
    const missing = publishable
      .map(readPackageJson)
      .filter((pkg) => pkg.engines?.node !== ">=22")
      .map((pkg) => pkg.name);
    expect(missing).toEqual([]);
  });

  it("mcp-server declares engines.node >=22", () => {
    const pkg = readPackageJson(join(repoRoot, "apps", "mcp-server"));
    expect(pkg.engines?.node).toBe(">=22");
  });

  it("mcp-server exposes a bin entry pointing at an existing thin launcher", () => {
    const dir = join(repoRoot, "apps", "mcp-server");
    const pkg = readPackageJson(dir);
    expect(pkg.bin).toBeDefined();
    const targets = typeof pkg.bin === "string" ? [pkg.bin] : Object.values(pkg.bin ?? {});
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      expect(existsSync(join(dir, target))).toBe(true);
    }
  });

  it("thin launcher delegates to the stdio transport entry", () => {
    const dir = join(repoRoot, "apps", "mcp-server");
    const launcher = readFileSync(join(dir, "bin", "mcp-server.mjs"), "utf-8");
    expect(launcher.startsWith("#!/usr/bin/env node")).toBe(true);
    expect(launcher).toContain("stdio-entry.ts");
    const entry = readFileSync(join(dir, "src", "transport", "stdio-entry.ts"), "utf-8");
    expect(entry).toContain("startStdioTransport");
  });
});
