import "../../packages/blocks/src/index.ts";
import "../../packages/marks/src/index.ts";
import { registerTheme, renderMarkdown } from "../../packages/core/src/index.ts";
import defaultTheme from "../../packages/themes/default/src/index.ts";

export interface CrossRuntimeFixture {
  name: string;
  markdown: string;
  themeId?: string;
}

export const FIXTURES: CrossRuntimeFixture[] = [
  {
    name: "cjk-heading",
    markdown: "# 你好，世界\n\n这是一段中英混排 text 内容，用于验证 CJK 渲染一致性。",
    themeId: "default",
  },
  {
    name: "block-directive",
    markdown: ":::callout\n重要提示：跨运行时必须产出字节一致的 HTML。\n:::",
    themeId: "default",
  },
  {
    name: "frontmatter",
    markdown:
      "---\ntitle: 测试文档\ntheme: default\n---\n\n## 正文标题\n\n段落 with **粗体** 和 CJK 字符。",
  },
];

type RenderFn = (input: string, options?: { themeId?: string }) => Promise<{ html: string }>;

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

let registered = false;
function ensureRegistered(): void {
  if (registered) return;
  registerTheme(defaultTheme);
  registered = true;
}

export async function computeFixtureHashes(
  render: RenderFn = renderMarkdown
): Promise<Record<string, string>> {
  ensureRegistered();
  const hashes: Record<string, string> = {};
  for (const fixture of FIXTURES) {
    const { html } = await render(
      fixture.markdown,
      fixture.themeId ? { themeId: fixture.themeId } : undefined
    );
    hashes[fixture.name] = await sha256Hex(html);
  }
  return hashes;
}

// Golden SHA-256 of each fixture's rendered HTML. Every runtime asserts its
// freshly computed hashes equal this map, so all four transitively agree byte
// for byte. Regenerate with `pnpm gen:cross-runtime-hashes` when render output
// legitimately changes.
export const EXPECTED_HASHES: Record<string, string> = {
  "cjk-heading": "8650b22716773748e56a36f754c72ebb83d561895e4f2e8f62a61cf51859e9aa",
  "block-directive": "9e65c0927fcc6956a20c9fc3f54227940988c5cd6bd948ab2a0d61f6353615f3",
  frontmatter: "8d3eebcff21e9e92c0b9083a2e93aef0d4788f53e388dd181c0b06c4742d0a7e",
};
