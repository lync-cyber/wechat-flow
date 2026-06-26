import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerBuiltins } from "../../apps/cli/src/bootstrap.ts";
import { runRender } from "../../apps/cli/src/commands/render.ts";

let tmpDir: string;

beforeAll(() => {
  registerBuiltins();
});

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-render-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("AC-003: runRender produces inline-styled HTML", () => {
  it("returns exitCode 0 and stdout contains style= attributes", async () => {
    const inputPath = path.join(tmpDir, "article.md");
    fs.writeFileSync(inputPath, "# Hello\n\nWorld\n", "utf-8");

    const result = await runRender({ input: inputPath, theme: "default" });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('style="');
  });

  it("output does not contain <style> tags", async () => {
    const inputPath = path.join(tmpDir, "article.md");
    fs.writeFileSync(inputPath, "# Hello\n\nParagraph text.\n", "utf-8");

    const result = await runRender({ input: inputPath, theme: "default" });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toMatch(/<style[\s>]/i);
  });

  it("returns exitCode 1 and stderr when file does not exist", async () => {
    const result = await runRender({ input: path.join(tmpDir, "nonexistent.md") });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Cannot read file");
  });

  it("defaults theme to 'default' when not specified", async () => {
    const inputPath = path.join(tmpDir, "article.md");
    fs.writeFileSync(inputPath, "# Test\n", "utf-8");

    const result = await runRender({ input: inputPath });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('style="');
  });
});
