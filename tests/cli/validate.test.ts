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

  it("template=theme produces theme manifest with type=theme field", () => {
    const result = runInit("my-theme", { template: "theme", dir: tmpDir });

    const packDir = path.join(tmpDir, "my-theme");
    expect(result.createdDir).toBe(packDir);

    const manifest = JSON.parse(fs.readFileSync(path.join(packDir, "manifest.json"), "utf-8")) as {
      name: string;
      type: string;
    };
    expect(manifest.name).toBe("my-theme");
    expect(manifest.type).toBe("theme");

    const indexContent = fs.readFileSync(path.join(packDir, "src", "index.ts"), "utf-8");
    expect(indexContent).toContain("Theme entry point");
  });

  it("uses process.cwd() as base dir when dir option is not provided", () => {
    const originalCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      const result = runInit("cwd-pack", { template: "plugin" });
      expect(result.createdDir).toBe(path.join(tmpDir, "cwd-pack"));
      expect(fs.existsSync(result.createdDir)).toBe(true);
    } finally {
      process.chdir(originalCwd);
    }
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

describe("runValidate edge cases", () => {
  it("returns E_MANIFEST_INVALID when manifest.json does not exist", () => {
    const emptyDir = path.join(tmpDir, "no-manifest");
    fs.mkdirSync(emptyDir);

    const result = runValidate(emptyDir);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("E_MANIFEST_INVALID: manifest.json not found");
  });

  it("returns E_MANIFEST_INVALID when manifest.json contains invalid JSON", () => {
    const brokenDir = path.join(tmpDir, "bad-json");
    fs.mkdirSync(brokenDir);
    fs.writeFileSync(path.join(brokenDir, "manifest.json"), "{ not valid json }", "utf-8");

    const result = runValidate(brokenDir);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("E_MANIFEST_INVALID: manifest.json is not valid JSON");
  });

  it("falls back to String(name) for id when id field is missing in manifest", () => {
    const packDir = path.join(tmpDir, "no-id-pack");
    fs.mkdirSync(packDir);
    fs.writeFileSync(
      path.join(packDir, "manifest.json"),
      JSON.stringify({ name: "no-id-pack" }),
      "utf-8"
    );

    const result = runValidate(packDir);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("通过");
  });

  it("returns E_MANIFEST_VARIANT_MISMATCH when intents declare non-registered variants", () => {
    const packDir = path.join(tmpDir, "mismatch-pack");
    fs.mkdirSync(packDir);
    fs.writeFileSync(
      path.join(packDir, "manifest.json"),
      JSON.stringify({
        name: "mismatch-pack",
        id: "mismatch-pack",
        intents: {
          variants: [{ blockId: "h1", variantId: "fancy" }],
        },
      }),
      "utf-8"
    );

    const result = runValidate(packDir);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("E_MANIFEST_VARIANT_MISMATCH");
    expect(result.stderr).toContain("block=h1");
  });

  it("treats array-valued intents field as undefined (no variant check)", () => {
    const packDir = path.join(tmpDir, "array-intents-pack");
    fs.mkdirSync(packDir);
    fs.writeFileSync(
      path.join(packDir, "manifest.json"),
      JSON.stringify({
        name: "array-intents-pack",
        id: "array-intents-pack",
        intents: ["invalid-array-format"],
      }),
      "utf-8"
    );

    const result = runValidate(packDir);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("通过");
  });
});
