import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runInit } from "../../apps/cli/src/commands/init.ts";
import { runValidate } from "../../apps/cli/src/commands/validate.ts";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-cli-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("AC-001: runInit creates plugin pack on disk", () => {
  it("creates directory with manifest.json, src/index.ts, package.json", () => {
    const result = runInit("my-pack", { template: "plugin", dir: tmpDir });

    const packDir = path.join(tmpDir, "my-pack");
    expect(fs.existsSync(packDir)).toBe(true);
    expect(fs.existsSync(path.join(packDir, "manifest.json"))).toBe(true);
    expect(fs.existsSync(path.join(packDir, "src", "index.ts"))).toBe(true);
    expect(fs.existsSync(path.join(packDir, "package.json"))).toBe(true);

    expect(result.createdDir).toBe(packDir);
    expect(result.files).toContain(path.join(packDir, "manifest.json"));
    expect(result.files).toContain(path.join(packDir, "src", "index.ts"));
    expect(result.files).toContain(path.join(packDir, "package.json"));
  });

  it("manifest.json contains name field matching pack name", () => {
    runInit("my-pack", { template: "plugin", dir: tmpDir });
    const manifest = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "my-pack", "manifest.json"), "utf-8")
    );
    expect(manifest.name).toBe("my-pack");
  });
});

describe("AC-002: runValidate with compliant pack exits 0", () => {
  it("returns exitCode 0 and stdout with passing message", () => {
    runInit("good-pack", { template: "plugin", dir: tmpDir });
    const packDir = path.join(tmpDir, "good-pack");
    const result = runValidate(packDir);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("通过：manifest ✓ schema ✓ 主题守护 ✓");
  });
});

describe("AC-003: runValidate with broken pack (missing name) exits non-0", () => {
  it("returns non-zero exitCode and stderr with E_MANIFEST_INVALID error", () => {
    const brokenDir = path.join(tmpDir, "broken-pack");
    fs.mkdirSync(brokenDir);
    fs.writeFileSync(
      path.join(brokenDir, "manifest.json"),
      JSON.stringify({ id: "broken-pack", permissions: { network: [] } })
    );

    const result = runValidate(brokenDir);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("E_MANIFEST_INVALID: missing required field 'name'");
  });
});
