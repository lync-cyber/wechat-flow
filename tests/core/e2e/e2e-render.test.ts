import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { registerTheme, renderMarkdown, simulatePaste } from "../../../packages/core/src/index.ts";
import "../../../packages/blocks/src/index.ts";
import "../../../packages/marks/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const UPDATE_SNAPSHOTS = Boolean(process.env.UPDATE_SNAPSHOTS);

const sha256 = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex");

const fixtureNames = readdirSync(FIXTURES_DIR)
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.replace(/\.md$/, ""))
  .sort();

// M-004 drops only `id` and the `position` style declaration; every other attribute —
// including `style` carrying theme inline declarations — is whitelisted and must survive paste.
const isWhitelistedAttr = (attrName: string): boolean =>
  attrName !== "id" && attrName !== "style:position";

beforeAll(() => {
  registerTheme(defaultTheme);
});

describe("T-057 AC-002: fixture scenario coverage", () => {
  it("loads at least 10 markdown fixtures", () => {
    expect(fixtureNames.length).toBeGreaterThanOrEqual(10);
  });
});

describe("T-057 E2E render fixtures (Markdown → final inline-styled HTML)", () => {
  for (const name of fixtureNames) {
    it(`${name}: deterministic byte-exact snapshot, sanitized, paste-safe`, async () => {
      const input = readFileSync(join(FIXTURES_DIR, `${name}.md`), "utf8");
      const { html } = await renderMarkdown(input, { themeId: "default" });

      // AC-003: product contract is inline-styled HTML — no <style>/<script> survive sanitize.
      expect(/<style[\s>]/i.test(html)).toBe(false);
      expect(/<script[\s>]/i.test(html)).toBe(false);

      // AC-004: simulatePaste must not drop any whitelisted attribute (theme inline styles survive).
      const { droppedAttrs } = simulatePaste(html);
      const droppedWhitelisted = droppedAttrs.filter((d) => isWhitelistedAttr(d.attrName));
      expect(droppedWhitelisted).toEqual([]);

      // AC-001 / AC-005: byte-exact snapshot via SHA-256; UPDATE_SNAPSHOTS=1 regenerates baselines.
      const snapshotPath = join(FIXTURES_DIR, `${name}.html`);
      if (UPDATE_SNAPSHOTS) {
        writeFileSync(snapshotPath, html, "utf8");
        return;
      }
      expect(
        existsSync(snapshotPath),
        `snapshot missing for ${name}; run \`pnpm test:update-snapshots\``
      ).toBe(true);
      expect(sha256(html)).toBe(sha256(readFileSync(snapshotPath, "utf8")));
    });
  }
});

describe("T-057 AC-004: whitelisted inline style survives wechat paste filter", () => {
  it("a theme-styled fixture keeps its inline style attribute after simulatePaste", async () => {
    const input = readFileSync(join(FIXTURES_DIR, "01-basic-heading-paragraph.md"), "utf8");
    const { html } = await renderMarkdown(input, { themeId: "default" });
    expect(html).toContain('style="');
    const { filteredHtml } = simulatePaste(html);
    expect(filteredHtml).toContain('style="');
  });
});
