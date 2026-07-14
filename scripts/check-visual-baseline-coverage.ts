import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import "../packages/blocks/src/index.ts";
import "../packages/marks/src/index.ts";
import { buildCoreMatrix, buildFullMatrix } from "../e2e/visual/story-matrix.ts";

const PLATFORM = "linux";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

interface SpecCoverage {
  spec: string;
  builder: () => Promise<{ sceneName: string }[]>;
}

const SPECS: SpecCoverage[] = [
  { spec: "variant-matrix.spec.ts", builder: buildFullMatrix },
  { spec: "theme-matrix.spec.ts", builder: buildCoreMatrix },
];

function committedBaselines(spec: string): Set<string> {
  const dir = resolve(repoRoot, "e2e/visual/snapshots", PLATFORM, spec);
  try {
    return new Set(readdirSync(dir).filter((f) => f.endsWith(".png")));
  } catch {
    return new Set();
  }
}

let missingTotal = 0;
let orphanTotal = 0;

for (const { spec, builder } of SPECS) {
  const expected = new Set((await builder()).map((s) => `${s.sceneName}.png`));
  const actual = committedBaselines(spec);

  const missing = [...expected].filter((f) => !actual.has(f)).sort();
  const orphan = [...actual].filter((f) => !expected.has(f)).sort();

  missingTotal += missing.length;
  orphanTotal += orphan.length;

  if (missing.length > 0) {
    console.error(`\n✖ ${spec}: ${missing.length} 个已注册场景缺 ${PLATFORM} 基线快照:`);
    for (const f of missing) console.error(`    ${f}`);
  }
  if (orphan.length > 0) {
    console.warn(
      `\n⚠ ${spec}: ${orphan.length} 个孤儿基线（无对应已注册场景，变体删除/重命名后残留）:`
    );
    for (const f of orphan) console.warn(`    ${f}`);
  }
  if (missing.length === 0 && orphan.length === 0) {
    console.log(`✔ ${spec}: ${expected.size} 场景与基线一一对应`);
  }
}

if (missingTotal > 0) {
  console.error(
    `\n缺 ${missingTotal} 个基线。注册新 block/variant/theme 后须补 ${PLATFORM} 基线：触发 GitHub Actions 的 "Visual Baselines Update (Seed Linux)" workflow（gh workflow run visual-update.yml --ref <当前分支>），它在 Playwright linux 容器内全矩阵 --update-snapshots 并回提基线。`
  );
  process.exit(1);
}

if (orphanTotal > 0) {
  console.warn(`\n${orphanTotal} 个孤儿基线可清理（不阻断，删除对应 .png 即可）。`);
}

console.log(`\n基线覆盖检查通过（${PLATFORM}）。`);
