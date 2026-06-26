import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerBuiltins } from "../../apps/cli/src/bootstrap.ts";
import { runCopy } from "../../apps/cli/src/commands/copy.ts";

let tmpDir: string;

beforeAll(() => {
  registerBuiltins();
});

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-copy-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("runCopy produces paste payload", () => {
  it("returns exitCode 0 and a payload with html and text fields", async () => {
    const inputPath = path.join(tmpDir, "article.md");
    fs.writeFileSync(inputPath, "# Hello\n\nWorld\n", "utf-8");

    const result = await runCopy({ input: inputPath });

    expect(result.exitCode).toBe(0);
    expect(result.payload).toBeDefined();
    expect(typeof result.payload?.html).toBe("string");
    expect(typeof result.payload?.text).toBe("string");
  });

  it("payload.html does not contain <style> tags", async () => {
    const inputPath = path.join(tmpDir, "article.md");
    fs.writeFileSync(inputPath, "# Hello\n\nParagraph.\n", "utf-8");

    const result = await runCopy({ input: inputPath });

    expect(result.payload?.html).not.toMatch(/<style[\s>]/i);
  });

  it("payload.text has no HTML tags", async () => {
    const inputPath = path.join(tmpDir, "article.md");
    fs.writeFileSync(inputPath, "# Hello\n", "utf-8");

    const result = await runCopy({ input: inputPath });

    expect(result.payload?.text).not.toMatch(/<[^>]+>/);
  });

  it("returns exitCode 1 and stderr when file does not exist", async () => {
    const result = await runCopy({ input: path.join(tmpDir, "nonexistent.md") });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Cannot read file");
  });

  it("uses explicit theme when theme option is provided", async () => {
    const inputPath = path.join(tmpDir, "article.md");
    fs.writeFileSync(inputPath, "# Hello\n", "utf-8");

    const result = await runCopy({ input: inputPath, theme: "default" });

    expect(result.exitCode).toBe(0);
    expect(result.payload).toBeDefined();
  });
});
