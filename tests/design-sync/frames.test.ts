import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  COMPONENT_IDS,
  PAGE_IDS,
  checkFrames,
  expectedFrameFiles,
} from "../../scripts/design-sync/export-penpot-frames";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const realFrames = `${repoRoot}/docs/design/frames`;

describe("expectedFrameFiles", () => {
  it("enumerates 23 component + 5 page frame filenames", () => {
    expect(COMPONENT_IDS.length).toBe(23);
    expect(PAGE_IDS.length).toBe(5);
    expect(expectedFrameFiles("components")).toContain("UC-001.png");
    expect(expectedFrameFiles("components")).toContain("UC-023.png");
    expect(expectedFrameFiles("pages")).toContain("P-001-desktop.png");
  });
});

describe("checkFrames — frozen export set is complete", () => {
  it("finds all 23 component frames present with zero missing", () => {
    const r = checkFrames("components", realFrames);
    expect(r.missing).toEqual([]);
    expect(r.present.length).toBe(23);
  });
  it("finds all 5 page frames present with zero missing", () => {
    const r = checkFrames("pages", realFrames);
    expect(r.missing).toEqual([]);
    expect(r.present.length).toBe(5);
  });
});

describe("checkFrames — partial set flags missing ids", () => {
  it("lists the missing component ids when only a subset exists", () => {
    const root = mkdtempSync(join(tmpdir(), "frames-"));
    mkdirSync(join(root, "components"), { recursive: true });
    writeFileSync(join(root, "components", "UC-001.png"), "");
    writeFileSync(join(root, "components", "UC-002.png"), "");
    const r = checkFrames("components", root);
    expect(r.present).toEqual(["UC-001.png", "UC-002.png"]);
    expect(r.missing.length).toBe(21);
    expect(r.missing).toContain("UC-023.png");
  });
  it("reports every id missing when the directory is absent", () => {
    const r = checkFrames("pages", join(tmpdir(), "design-frames-absent-xyz"));
    expect(r.present).toEqual([]);
    expect(r.missing.length).toBe(5);
  });
});
