import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runRealworldVerify } from "../../scripts/realworld-verify.ts";

const SAMPLES_DIR = join(import.meta.dirname, "samples");
const ALLOWED_KEYS = new Set([
  "ts",
  "event",
  "phase",
  "agent",
  "task_type",
  "status",
  "ref",
  "detail",
]);

let tmpDir: string;
let outDir: string;
let eventLogPath: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "realworld-verify-"));
  outDir = join(tmpDir, "output");
  eventLogPath = join(tmpDir, "event-log.jsonl");
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("AC-001: runRealworldVerify renders 5 themes × 5 samples = 25 HTML files", () => {
  it("produces 25 non-empty inline-styled HTML files under {outDir}/{theme}/{sample}.html", async () => {
    const result = await runRealworldVerify({ outDir, eventLogPath, samplesDir: SAMPLES_DIR });

    expect(result.rendered).toHaveLength(25);

    const themes = ["default", "business", "literary", "magazine", "tech"];
    const sampleNames = readdirSync(SAMPLES_DIR)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, ""));

    expect(sampleNames).toHaveLength(5);

    for (const theme of themes) {
      for (const sample of sampleNames) {
        const filePath = join(outDir, theme, `${sample}.html`);
        expect(existsSync(filePath), `missing: ${theme}/${sample}.html`).toBe(true);
        const content = readFileSync(filePath, "utf8");
        expect(content.length, `empty file: ${theme}/${sample}.html`).toBeGreaterThan(0);
        expect(content, `no inline style in: ${theme}/${sample}.html`).toContain('style="');
      }
    }
  });

  it("returns rendered array entries with theme, sample, and outPath fields", async () => {
    const result = await runRealworldVerify({ outDir, eventLogPath, samplesDir: SAMPLES_DIR });

    for (const entry of result.rendered) {
      expect(typeof entry.theme).toBe("string");
      expect(typeof entry.sample).toBe("string");
      expect(typeof entry.outPath).toBe("string");
      expect(existsSync(entry.outPath)).toBe(true);
    }
  });
});

describe("AC-002: event log entries are schema-valid state_change records", () => {
  it("appends exactly 25 lines to eventLogPath, each a valid state_change event", async () => {
    const result = await runRealworldVerify({ outDir, eventLogPath, samplesDir: SAMPLES_DIR });

    expect(result.eventsAppended).toBe(25);

    const lines = readFileSync(eventLogPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(25);

    for (const line of lines) {
      const record = JSON.parse(line) as Record<string, unknown>;

      expect(record.event).toBe("state_change");
      expect(record.phase).toBe("development");
      expect(typeof record.ts).toBe("string");
      expect(typeof record.detail).toBe("string");
      expect(record.detail as string).toMatch(/realworld_verify/);
      expect(typeof record.ref).toBe("string");

      const keys = Object.keys(record);
      for (const key of keys) {
        expect(ALLOWED_KEYS.has(key), `unexpected key "${key}" in event log record`).toBe(true);
      }
    }
  });

  it("ref field in each event points to the corresponding output html path", async () => {
    await runRealworldVerify({ outDir, eventLogPath, samplesDir: SAMPLES_DIR });

    const lines = readFileSync(eventLogPath, "utf8").trim().split("\n");
    for (const line of lines) {
      const record = JSON.parse(line) as Record<string, unknown>;
      const ref = record.ref as string;
      expect(existsSync(ref), `ref path does not exist: ${ref}`).toBe(true);
    }
  });

  it("ts field is a valid ISO 8601 datetime string", async () => {
    await runRealworldVerify({ outDir, eventLogPath, samplesDir: SAMPLES_DIR });

    const lines = readFileSync(eventLogPath, "utf8").trim().split("\n");
    for (const line of lines) {
      const record = JSON.parse(line) as Record<string, unknown>;
      const ts = record.ts as string;
      expect(Number.isNaN(Date.parse(ts))).toBe(false);
    }
  });
});

describe("AC-003: themeFilter and sampleFilter narrow output", () => {
  it("themeFilter='tech' produces only 5 files (one per sample) under tech/ subdir", async () => {
    const result = await runRealworldVerify({
      outDir,
      eventLogPath,
      samplesDir: SAMPLES_DIR,
      themeFilter: "tech",
    });

    expect(result.rendered).toHaveLength(5);
    expect(result.eventsAppended).toBe(5);

    for (const entry of result.rendered) {
      expect(entry.theme).toBe("tech");
    }

    const techDir = join(outDir, "tech");
    expect(existsSync(techDir)).toBe(true);

    const themes = ["default", "business", "literary", "magazine"];
    for (const theme of themes) {
      expect(existsSync(join(outDir, theme))).toBe(false);
    }
  });

  it("sampleFilter='01-article-with-headings' produces only 5 files (one per theme)", async () => {
    const result = await runRealworldVerify({
      outDir,
      eventLogPath,
      samplesDir: SAMPLES_DIR,
      sampleFilter: "01-article-with-headings",
    });

    expect(result.rendered).toHaveLength(5);
    expect(result.eventsAppended).toBe(5);

    for (const entry of result.rendered) {
      expect(entry.sample).toBe("01-article-with-headings");
    }
  });

  it("combined themeFilter and sampleFilter produces exactly 1 file", async () => {
    const result = await runRealworldVerify({
      outDir,
      eventLogPath,
      samplesDir: SAMPLES_DIR,
      themeFilter: "business",
      sampleFilter: "03-code-and-table",
    });

    expect(result.rendered).toHaveLength(1);
    expect(result.eventsAppended).toBe(1);

    const filePath = join(outDir, "business", "03-code-and-table.html");
    expect(existsSync(filePath)).toBe(true);
  });
});
