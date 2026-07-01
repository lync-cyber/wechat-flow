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
  "cjk-heading": "cb9c01f45dd71b185679da34d89f41ce61783e032e3458fff56480a09d2ebf56",
  "block-directive": "2abef30387135a288e74d85c90c2cbdeb19c9a40f15b0b07926601ddfafcad3a",
  frontmatter: "14f3321390645e625b563d544038a2d3296e0f908440c2d423b99851b880aa72",
};
