import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  getBlockBaseStyle,
  renderMarkdown,
  resetBlockRegistry,
  resetVariantRegistry,
} from "../../../packages/core/src/index.ts";
import "../../../packages/blocks/src/index.ts";
import businessTheme from "../../../packages/themes/business/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";
import literaryTheme from "../../../packages/themes/literary/src/index.ts";
import magazineTheme from "../../../packages/themes/magazine/src/index.ts";
import techTheme from "../../../packages/themes/tech/src/index.ts";

beforeEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
});

// AC-T120-001: callout 容器 style 含 L1 base-style 且无 var(--
describe("AC-T120-001: callout 容器 style 含 getBlockBaseStyle('callout','default') 且无 var(--", () => {
  it("renderMarkdown callout directive 无 customCss → 容器 style 含 border-left 且无 var(--", async () => {
    const baseStyle = getBlockBaseStyle("callout", "default");
    // Verify that callout has a non-empty base style to test against
    expect(Object.keys(baseStyle).length).toBeGreaterThan(0);

    const borderLeftValue = baseStyle["border-left"];
    expect(typeof borderLeftValue).toBe("string");

    const result = await renderMarkdown(":::callout\ncontent\n:::", {
      themeId: "default",
    });

    // The callout container element must carry the L1 base-style from getBlockBaseStyle
    // Currently containers are not expanded → no data-block, no base-style applied → FAIL
    expect(result.html).toMatch(/data-block="callout"/);
    expect(result.html).toMatch(/border-left/);

    // No CSS custom properties (var(--) must not appear — pure inline values
    expect(result.html).not.toContain("var(--");
  });
});

// AC-T120-002 regression-guard: tag-path 字节不变（无 customCss，5 主题）
// Expected to PASS as regression-guard — captures SHA-256 of current render output.
// These hashes lock the "no customCss, tag-path only" render so that GREEN's L1⊕L2 refactor
// doesn't alter plain Markdown output.
const REPRESENTATIVE_MD = `# 一级标题

## 二级标题

这是一段普通段落，包含**粗体**和*斜体*文字。

> 这是一段引用内容，用于测试 blockquote 样式

\`\`\`
const code = 'code block';
\`\`\`

---
`;

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

describe("AC-T120-002 regression-guard: tag-path 字节不变（无 customCss，5 主题）", () => {
  // These hashes are identical to the T-118 migration-invariance baseline because the
  // representative markdown does not use container directives. Any change here means
  // the L1⊕L2 refactor has broken the tag-path output — that is a bug, not a feature.
  const BASELINE_HASHES: Record<string, string> = {
    default: "726c9149c24c23b30f9c93a30241ed5bfeb54ea5b9499cad0b29cd5788b75ee8",
    magazine: "5e0807f7d0b513bb3a9fab896191cafa2a61df4e4e79030f938d6f615e203d39",
    literary: "91e0775d7c9a019d60c03d0c6ccc5d00f8ac0af9b2df5df03f5f99c0085ccbec",
    business: "783631bc6c5e19012998353864c7af1ce62d6779fcce23e1b2b2cad1a2dd0026",
    tech: "0bda982b7559ef5312667b751f98119c10cc69be49d546575eee7e58ee296526",
  };

  it("default theme: tag-path render 与基线 SHA-256 一致", async () => {
    const result = await renderMarkdown(REPRESENTATIVE_MD, { theme: defaultTheme });
    expect(sha256(result.html)).toBe(BASELINE_HASHES.default);
  });

  it("magazine theme: tag-path render 与基线 SHA-256 一致", async () => {
    const result = await renderMarkdown(REPRESENTATIVE_MD, { theme: magazineTheme });
    expect(sha256(result.html)).toBe(BASELINE_HASHES.magazine);
  });

  it("literary theme: tag-path render 与基线 SHA-256 一致", async () => {
    const result = await renderMarkdown(REPRESENTATIVE_MD, { theme: literaryTheme });
    expect(sha256(result.html)).toBe(BASELINE_HASHES.literary);
  });

  it("business theme: tag-path render 与基线 SHA-256 一致", async () => {
    const result = await renderMarkdown(REPRESENTATIVE_MD, { theme: businessTheme });
    expect(sha256(result.html)).toBe(BASELINE_HASHES.business);
  });

  it("tech theme: tag-path render 与基线 SHA-256 一致", async () => {
    const result = await renderMarkdown(REPRESENTATIVE_MD, { theme: techTheme });
    expect(sha256(result.html)).toBe(BASELINE_HASHES.tech);
  });
});

// AC-T120-006: inline-style 不再导出名为 TokenDictionary 的、与 contracts 同名却异构的类型
describe("AC-T120-006: inline-style 模块局部类型不再使用 TokenDictionary（与 contracts 命名冲突）", () => {
  it("packages/core/src/pipeline/inline-style.ts 不含 'export interface TokenDictionary' 或 'export type TokenDictionary'", () => {
    const inlineStyleSrc = readFileSync(
      resolve(process.cwd(), "packages/core/src/pipeline/inline-style.ts"),
      "utf-8"
    );
    // The local 3-layer type must be renamed (e.g., BlockStyleTable) to avoid shadowing
    // contracts' TokenDictionary (= Record<string,string>, a palette type).
    // If this still says TokenDictionary, GREEN has not renamed it yet.
    expect(inlineStyleSrc).not.toMatch(/export\s+(interface|type)\s+TokenDictionary\b/);
  });

  it("packages/core/src/index.ts 不再从 inline-style 重导出 TokenDictionary", () => {
    const indexSrc = readFileSync(resolve(process.cwd(), "packages/core/src/index.ts"), "utf-8");
    // After GREEN renames, the barrel must export the new name, not TokenDictionary
    expect(indexSrc).not.toMatch(
      /export\s+type\s*\{[^}]*\bTokenDictionary\b[^}]*\}\s+from\s+["']\.\/pipeline\/inline-style/
    );
  });
});
