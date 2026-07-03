import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { COMPONENT_IDS, PAGE_IDS } from "./export-penpot-frames.ts";

export interface PrecheckEntry {
  id: string;
  penpotSize: string;
  frontendSize: string;
  arDiff: number;
  colorDist: number;
  score: number;
}

export interface PrecheckResult {
  missing: string[];
  ranked: PrecheckEntry[];
}

const REPORT_PATH = "docs/design/reports/overlay-precheck.json";
const FRONTEND_ROOT = "e2e/visual/design-overlay-output";
const SAMPLE_SIZE = 64;

export function aspectRatioDiff(
  a: { width: number; height: number },
  b: { width: number; height: number }
): number {
  const ra = a.width / a.height;
  const rb = b.width / b.height;
  return Math.abs(ra - rb) / Math.max(ra, rb);
}

// 等长 RGB 缓冲的平均通道距离（0-255）；粗量化配色/明暗差异，非像素级一致性
export function meanColorDistance(a: Uint8Array, b: Uint8Array): number {
  if (a.length !== b.length || a.length === 0) {
    throw new Error("meanColorDistance requires equal-length non-empty buffers");
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.abs(a[i] - b[i]);
  }
  return sum / a.length;
}

// ar 差与色距各占一半：ar 捕捉「导出粒度/裁剪形态」偏差，色距捕捉「配色/内容密度」偏差
export function rankScore(arDiff: number, colorDist: number): number {
  return arDiff * 0.5 + (colorDist / 255) * 0.5;
}

async function sampleRgb(
  path: string
): Promise<{ width: number; height: number; rgb: Uint8Array }> {
  const image = sharp(path);
  const meta = await image.metadata();
  const rgb = await image
    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();
  return { width: meta.width ?? 0, height: meta.height ?? 0, rgb: new Uint8Array(rgb) };
}

async function compareOne(
  id: string,
  penpotPath: string,
  frontendPath: string
): Promise<PrecheckEntry | null> {
  if (!existsSync(frontendPath)) return null;
  const [p, f] = await Promise.all([sampleRgb(penpotPath), sampleRgb(frontendPath)]);
  const arDiff = aspectRatioDiff(p, f);
  const colorDist = meanColorDistance(p.rgb, f.rgb);
  return {
    id,
    penpotSize: `${p.width}x${p.height}`,
    frontendSize: `${f.width}x${f.height}`,
    arDiff: Number(arDiff.toFixed(3)),
    colorDist: Number(colorDist.toFixed(1)),
    score: Number(rankScore(arDiff, colorDist).toFixed(3)),
  };
}

export async function runPrecheck(repoRoot: string = process.cwd()): Promise<PrecheckResult> {
  const missing: string[] = [];
  const ranked: PrecheckEntry[] = [];

  const pairs: { id: string; penpot: string; frontend: string }[] = [
    ...COMPONENT_IDS.map((id) => ({
      id,
      penpot: join(repoRoot, "docs/design/frames/components", `${id}.png`),
      frontend: join(repoRoot, FRONTEND_ROOT, "components", `${id}.png`),
    })),
    ...PAGE_IDS.map((id) => ({
      id,
      penpot: join(repoRoot, "docs/design/frames/pages", `${id}-desktop.png`),
      frontend: join(repoRoot, FRONTEND_ROOT, "pages", `${id}.png`),
    })),
  ];

  for (const pair of pairs) {
    if (!existsSync(pair.penpot)) continue;
    const entry = await compareOne(pair.id, pair.penpot, pair.frontend);
    if (entry === null) {
      missing.push(pair.id);
    } else {
      ranked.push(entry);
    }
  }

  ranked.sort((a, b) => b.score - a.score);
  return { missing, ranked };
}

function isMain(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return entry.endsWith("overlay-precheck.ts");
  }
}

if (isMain()) {
  const result = await runPrecheck();
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  if (result.missing.length > 0) {
    process.stdout.write(`前端截图缺失: ${result.missing.join(", ")}\n`);
  }
  process.stdout.write("差异排序（score 高 = 优先人工复核）:\n");
  for (const e of result.ranked) {
    process.stdout.write(
      `${e.id}\tscore=${e.score}\tarDiff=${e.arDiff}\tcolorDist=${e.colorDist}\t${e.penpotSize} vs ${e.frontendSize}\n`
    );
  }
  process.stdout.write(`precheck → ${REPORT_PATH}\n`);
}
