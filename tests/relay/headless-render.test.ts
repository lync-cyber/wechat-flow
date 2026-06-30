/**
 * T-035: Headless Playwright 渲染 — AC-001..AC-004
 *
 * 分层策略:
 * - 纯逻辑块 (format->尺寸映射、persistExport URL/路径逻辑): 永不 gate
 * - chromium 集成块: beforeAll 探测可达性，不可达则 describe.skipIf
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  buildExportUrl,
  persistExport,
  resolveExportDir,
} from "../../apps/relay/src/headless/persist-export.ts";
import { createPlaywrightPool } from "../../apps/relay/src/headless/playwright-pool.ts";
import type { PlaywrightPool } from "../../apps/relay/src/headless/playwright-pool.ts";
import { COVER_DIMENSIONS, renderCover } from "../../apps/relay/src/headless/render-cover.ts";
import { renderLongImage } from "../../apps/relay/src/headless/render-long-image.ts";

// ---------------------------------------------------------------------------
// Chromium gate: probe once, skip all browser tests if not reachable
// ---------------------------------------------------------------------------

let chromiumAvailable = false;

async function probeChromium(): Promise<boolean> {
  let browser: import("playwright").Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true, channel: "chromium" });
    return true;
  } catch {
    return false;
  } finally {
    if (browser) await browser.close();
  }
}

chromiumAvailable = await probeChromium();

const describeIfChromium = chromiumAvailable ? describe : describe.skip;

// Cold chromium launch in beforeAll exceeds vitest's 10s default hookTimeout under full-suite
// parallel + coverage load; the describe-level `timeout` only covers tests, not hooks.
const BROWSER_HOOK_TIMEOUT_MS = 60_000;

// ---------------------------------------------------------------------------
// Minimal HTML fixtures
// ---------------------------------------------------------------------------

const MINIMAL_HTML = `<!DOCTYPE html><html><body style="margin:0;padding:0;">
<div style="width:100%;height:1200px;background:#f0f0f0;">Article content</div>
</body></html>`;

const SHORT_HTML = `<!DOCTYPE html><html><body style="margin:0;padding:0;">
<div style="width:100%;height:400px;background:#e0e0e0;">Short content</div>
</body></html>`;

// ---------------------------------------------------------------------------
// AC-001/002/003 (pure logic): COVER_DIMENSIONS mapping + stub behavior
// These tests never need chromium.
// ---------------------------------------------------------------------------

describe("AC-001 (pure logic): format -> viewport dimension mapping", () => {
  it("COVER_DIMENSIONS.landscape -> width=900, height=383 (AC-002 spec)", () => {
    expect(COVER_DIMENSIONS.landscape.width).toBe(900);
    expect(COVER_DIMENSIONS.landscape.height).toBe(383);
  });

  it("COVER_DIMENSIONS.square -> width=900, height=900 (AC-003 spec)", () => {
    expect(COVER_DIMENSIONS.square.width).toBe(900);
    expect(COVER_DIMENSIONS.square.height).toBe(900);
  });

  it("landscape and square share width=900 but have different heights", () => {
    expect(COVER_DIMENSIONS.landscape.width).toBe(COVER_DIMENSIONS.square.width);
    expect(COVER_DIMENSIONS.landscape.height).not.toBe(COVER_DIMENSIONS.square.height);
  });

  it("landscape cover width (900) differs from long-image default viewportWidth (750)", () => {
    expect(COVER_DIMENSIONS.landscape.width).not.toBe(750);
  });
});

// ---------------------------------------------------------------------------
// AC-004 (pure logic): persistExport URL / path logic -- no chromium needed
// ---------------------------------------------------------------------------

describe("AC-004 (pure logic): persistExport URL path structure", () => {
  it("buildExportUrl returns '/exports/<filename>' for a given filename", () => {
    const url = buildExportUrl("my-image.png");
    expect(url).toBe("/exports/my-image.png");
  });

  it("buildExportUrl includes the exact filename in the URL path", () => {
    const filename = "article-123-cover-landscape.png";
    const url = buildExportUrl(filename);
    expect(url).toContain(filename);
    expect(url.startsWith("/exports/")).toBe(true);
  });

  it("resolveExportDir with explicit dir returns that dir", () => {
    const customDir = "/tmp/custom-exports";
    const resolved = resolveExportDir(customDir);
    expect(resolved).toBe(customDir);
  });

  it("resolveExportDir without dir falls back to public/exports under cwd", () => {
    const resolved = resolveExportDir(undefined);
    expect(resolved).toContain("public");
    expect(resolved).toContain("exports");
  });
});

// ---------------------------------------------------------------------------
// AC-004 (file I/O logic): persistExport writes to dir and returns url + path
// Uses a temp dir so tests never pollute public/exports.
// ---------------------------------------------------------------------------

describe("AC-004 (file I/O): persistExport writes buffer and returns url + absolute path", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "wf-export-test-"));
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("writes buffer content to <dir>/<filename> and the file exists after call", async () => {
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG magic
    const filename = "test-export.png";
    const result = await persistExport(bytes, { dir: tmpDir, filename });

    const written = await fs.readFile(result.path);
    expect(written.subarray(0, 8)).toEqual(bytes);
  });

  it("returned path is the absolute path to the written file inside the specified dir", async () => {
    const bytes = Buffer.from("mock-png-content");
    const filename = "path-check.png";
    const result = await persistExport(bytes, { dir: tmpDir, filename });

    expect(result.path).toBe(path.join(tmpDir, filename));
  });

  it("returned url is '/exports/<filename>'", async () => {
    const bytes = Buffer.from("mock-png-content-2");
    const filename = "url-check.png";
    const result = await persistExport(bytes, { dir: tmpDir, filename });

    expect(result.url).toBe(`/exports/${filename}`);
  });

  it("subsequent call with different filename writes a distinct file", async () => {
    const bytes1 = Buffer.from("content-a");
    const bytes2 = Buffer.from("content-b");
    const result1 = await persistExport(bytes1, { dir: tmpDir, filename: "file-a.png" });
    const result2 = await persistExport(bytes2, { dir: tmpDir, filename: "file-b.png" });

    expect(result1.path).not.toBe(result2.path);
    const a = await fs.readFile(result1.path);
    const b = await fs.readFile(result2.path);
    expect(a.toString()).toBe("content-a");
    expect(b.toString()).toBe("content-b");
  });
});

// ---------------------------------------------------------------------------
// AC-001 (chromium): renderLongImage -- PNG width = viewportWidth, height = full content
// ---------------------------------------------------------------------------

describeIfChromium(
  "AC-001 (chromium): renderLongImage produces PNG with correct width and content height",
  { timeout: 30000 },
  () => {
    let pool: PlaywrightPool | undefined;

    beforeAll(async () => {
      pool = createPlaywrightPool({ size: 1 });
    }, BROWSER_HOOK_TIMEOUT_MS);

    afterAll(async () => {
      await pool?.close();
    }, BROWSER_HOOK_TIMEOUT_MS);

    it("returns a Buffer (not null/undefined)", async () => {
      const result = await renderLongImage(pool as PlaywrightPool, MINIMAL_HTML);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.byteLength).toBeGreaterThan(0);
    });

    it("output is a valid PNG (magic bytes 89 50 4E 47)", async () => {
      const result = await renderLongImage(pool as PlaywrightPool, MINIMAL_HTML);
      expect(result[0]).toBe(0x89);
      expect(result[1]).toBe(0x50);
      expect(result[2]).toBe(0x4e);
      expect(result[3]).toBe(0x47);
    });

    it("PNG width equals default viewportWidth=750 when no opts provided", async () => {
      const result = await renderLongImage(pool as PlaywrightPool, MINIMAL_HTML);
      const meta = await sharp(result).metadata();
      expect(meta.width).toBe(750);
    });

    it("PNG width equals custom viewportWidth=800 when opts.viewportWidth=800", async () => {
      const result = await renderLongImage(pool as PlaywrightPool, MINIMAL_HTML, {
        viewportWidth: 800,
      });
      const meta = await sharp(result).metadata();
      expect(meta.width).toBe(800);
    });

    it("PNG width equals custom viewportWidth=375 (mobile) when specified", async () => {
      const result = await renderLongImage(pool as PlaywrightPool, MINIMAL_HTML, {
        viewportWidth: 375,
      });
      const meta = await sharp(result).metadata();
      expect(meta.width).toBe(375);
    });

    it("PNG height captures full content height (>= declared div height of 1200px)", async () => {
      const result = await renderLongImage(pool as PlaywrightPool, MINIMAL_HTML);
      const meta = await sharp(result).metadata();
      // MINIMAL_HTML has a div of height 1200px; full-page capture must be >= 1200
      expect(meta.height ?? 0).toBeGreaterThanOrEqual(1200);
    });

    it("shorter content HTML produces shorter PNG height than taller content HTML", async () => {
      const [longResult, shortResult] = await Promise.all([
        renderLongImage(pool as PlaywrightPool, MINIMAL_HTML),
        renderLongImage(pool as PlaywrightPool, SHORT_HTML),
      ]);
      const longMeta = await sharp(longResult).metadata();
      const shortMeta = await sharp(shortResult).metadata();
      expect(longMeta.height ?? 0).toBeGreaterThan(shortMeta.height ?? 0);
    });
  }
);

// ---------------------------------------------------------------------------
// AC-002 (chromium): renderCover landscape -> 900x383 PNG
// ---------------------------------------------------------------------------

describeIfChromium(
  "AC-002 (chromium): renderCover landscape produces 900x383 PNG",
  { timeout: 30000 },
  () => {
    let pool: PlaywrightPool | undefined;

    beforeAll(async () => {
      pool = createPlaywrightPool({ size: 1 });
    }, BROWSER_HOOK_TIMEOUT_MS);

    afterAll(async () => {
      await pool?.close();
    }, BROWSER_HOOK_TIMEOUT_MS);

    it("returns a Buffer with landscape format", async () => {
      const result = await renderCover(pool as PlaywrightPool, SHORT_HTML, { format: "landscape" });
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.byteLength).toBeGreaterThan(0);
    });

    it("landscape PNG is exactly 900px wide", async () => {
      const result = await renderCover(pool as PlaywrightPool, SHORT_HTML, { format: "landscape" });
      const meta = await sharp(result).metadata();
      expect(meta.width).toBe(900);
    });

    it("landscape PNG is exactly 383px tall", async () => {
      const result = await renderCover(pool as PlaywrightPool, SHORT_HTML, { format: "landscape" });
      const meta = await sharp(result).metadata();
      expect(meta.height).toBe(383);
    });

    it("landscape PNG has valid PNG magic bytes", async () => {
      const result = await renderCover(pool as PlaywrightPool, SHORT_HTML, { format: "landscape" });
      expect(result[0]).toBe(0x89);
      expect(result[1]).toBe(0x50);
      expect(result[2]).toBe(0x4e);
      expect(result[3]).toBe(0x47);
    });
  }
);

// ---------------------------------------------------------------------------
// AC-003 (chromium): renderCover square -> 900x900 PNG
// ---------------------------------------------------------------------------

describeIfChromium(
  "AC-003 (chromium): renderCover square produces 900x900 PNG",
  { timeout: 30000 },
  () => {
    let pool: PlaywrightPool | undefined;

    beforeAll(async () => {
      pool = createPlaywrightPool({ size: 1 });
    }, BROWSER_HOOK_TIMEOUT_MS);

    afterAll(async () => {
      await pool?.close();
    }, BROWSER_HOOK_TIMEOUT_MS);

    it("returns a Buffer with square format", async () => {
      const result = await renderCover(pool as PlaywrightPool, SHORT_HTML, { format: "square" });
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.byteLength).toBeGreaterThan(0);
    });

    it("square PNG is exactly 900px wide", async () => {
      const result = await renderCover(pool as PlaywrightPool, SHORT_HTML, { format: "square" });
      const meta = await sharp(result).metadata();
      expect(meta.width).toBe(900);
    });

    it("square PNG is exactly 900px tall", async () => {
      const result = await renderCover(pool as PlaywrightPool, SHORT_HTML, { format: "square" });
      const meta = await sharp(result).metadata();
      expect(meta.height).toBe(900);
    });

    it("square PNG has valid PNG magic bytes", async () => {
      const result = await renderCover(pool as PlaywrightPool, SHORT_HTML, { format: "square" });
      expect(result[0]).toBe(0x89);
      expect(result[1]).toBe(0x50);
      expect(result[2]).toBe(0x4e);
      expect(result[3]).toBe(0x47);
    });
  }
);

// ---------------------------------------------------------------------------
// AC-004 (chromium): renderLongImage result + persistExport end-to-end
// Verifies that a real-rendered PNG can be persisted and that the job result
// contains an accessible URL path.
// ---------------------------------------------------------------------------

describeIfChromium(
  "AC-004 (chromium): rendered PNG is persisted to local storage and job result contains URL",
  { timeout: 30000 },
  () => {
    let pool: PlaywrightPool | undefined;
    let tmpDir: string;
    const createdFiles: string[] = [];

    beforeAll(async () => {
      pool = createPlaywrightPool({ size: 1 });
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "wf-export-chromium-test-"));
    }, BROWSER_HOOK_TIMEOUT_MS);

    afterAll(async () => {
      await pool?.close();
      await fs.rm(tmpDir, { recursive: true, force: true });
    }, BROWSER_HOOK_TIMEOUT_MS);

    afterEach(async () => {
      for (const filePath of createdFiles.splice(0)) {
        await fs.rm(filePath, { force: true }).catch(() => {});
      }
    });

    it("persistExport after renderLongImage writes a non-empty PNG file to the export dir", async () => {
      const bytes = await renderLongImage(pool as PlaywrightPool, MINIMAL_HTML);
      const filename = `long-image-${Date.now()}.png`;
      const result = await persistExport(bytes, { dir: tmpDir, filename });
      createdFiles.push(result.path);

      const stat = await fs.stat(result.path);
      expect(stat.size).toBeGreaterThan(0);
    });

    it("job result url from persistExport starts with '/exports/' (accessible URL)", async () => {
      const bytes = await renderLongImage(pool as PlaywrightPool, MINIMAL_HTML);
      const filename = `long-image-url-${Date.now()}.png`;
      const result = await persistExport(bytes, { dir: tmpDir, filename });
      createdFiles.push(result.path);

      expect(result.url.startsWith("/exports/")).toBe(true);
      expect(result.url).toContain(filename);
    });

    it("persistExport after renderCover landscape writes 900x383 PNG to export dir", async () => {
      const bytes = await renderCover(pool as PlaywrightPool, SHORT_HTML, { format: "landscape" });
      const filename = `cover-landscape-${Date.now()}.png`;
      const result = await persistExport(bytes, { dir: tmpDir, filename });
      createdFiles.push(result.path);

      const written = await fs.readFile(result.path);
      const meta = await sharp(written).metadata();
      expect(meta.width).toBe(900);
      expect(meta.height).toBe(383);
    });

    it("persistExport after renderCover square writes 900x900 PNG to export dir", async () => {
      const bytes = await renderCover(pool as PlaywrightPool, SHORT_HTML, { format: "square" });
      const filename = `cover-square-${Date.now()}.png`;
      const result = await persistExport(bytes, { dir: tmpDir, filename });
      createdFiles.push(result.path);

      const written = await fs.readFile(result.path);
      const meta = await sharp(written).metadata();
      expect(meta.width).toBe(900);
      expect(meta.height).toBe(900);
    });
  }
);
