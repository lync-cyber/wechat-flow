import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerBuiltins } from "../../apps/cli/src/bootstrap.ts";
import { runExport } from "../../apps/cli/src/commands/export.ts";

let tmpDir: string;

beforeAll(() => {
  registerBuiltins();
});

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-export-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("AC-005: runExport generates standalone HTML file", () => {
  it("creates an .html file when format is html, exitCode 0", async () => {
    const inputPath = path.join(tmpDir, "article.md");
    fs.writeFileSync(inputPath, "# Hello\n\nWorld\n", "utf-8");
    const outputPath = path.join(tmpDir, "article.html");

    const result = await runExport({ input: inputPath, format: "html", output: outputPath });

    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  it("exported file contains inline-styled HTML (style= attributes)", async () => {
    const inputPath = path.join(tmpDir, "article.md");
    fs.writeFileSync(inputPath, "# Hello\n\nParagraph.\n", "utf-8");
    const outputPath = path.join(tmpDir, "article.html");

    await runExport({ input: inputPath, format: "html", output: outputPath });

    const content = fs.readFileSync(outputPath, "utf-8");
    expect(content).toContain('style="');
  });

  it("defaults output path to <input basename>.html when output not specified", async () => {
    const inputPath = path.join(tmpDir, "article.md");
    fs.writeFileSync(inputPath, "# Hello\n", "utf-8");

    const result = await runExport({ input: inputPath, format: "html" });

    expect(result.exitCode).toBe(0);
    const defaultOutput = path.join(tmpDir, "article.html");
    expect(fs.existsSync(defaultOutput)).toBe(true);
  });

  it("stdout contains the output file path", async () => {
    const inputPath = path.join(tmpDir, "article.md");
    fs.writeFileSync(inputPath, "# Hello\n", "utf-8");
    const outputPath = path.join(tmpDir, "out.html");

    const result = await runExport({ input: inputPath, format: "html", output: outputPath });

    expect(result.stdout).toContain(outputPath);
  });

  it("returns exitCode 1 for unsupported format", async () => {
    const inputPath = path.join(tmpDir, "article.md");
    fs.writeFileSync(inputPath, "# Hello\n", "utf-8");

    const result = await runExport({ input: inputPath, format: "pdf" });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unsupported format");
  });

  it("returns exitCode 1 when input file does not exist", async () => {
    const result = await runExport({ input: path.join(tmpDir, "missing.md"), format: "html" });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Cannot read file");
  });

  it("returns exitCode 1 and stderr when output path is not writable", async () => {
    const inputPath = path.join(tmpDir, "article.md");
    fs.writeFileSync(inputPath, "# Hello\n", "utf-8");
    const unwritableOutput = path.join(tmpDir, "nonexistent-dir", "deep", "out.html");

    const result = await runExport({ input: inputPath, format: "html", output: unwritableOutput });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Cannot write file");
  });
});
