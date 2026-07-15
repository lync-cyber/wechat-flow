import { beforeAll, describe, expect, it } from "vitest";
import { describeBlock, registerTheme, renderMarkdown } from "../../packages/core/src/index.ts";
import { runVariantDiffGuard } from "../../packages/core/src/registry/variant-diff-guard.ts";
import "../../packages/blocks/src/index.ts";
import businessTheme from "../../packages/themes/business/src/index.ts";
import defaultTheme from "../../packages/themes/default/src/index.ts";
import literaryTheme from "../../packages/themes/literary/src/index.ts";
import magazineTheme from "../../packages/themes/magazine/src/index.ts";
import techTheme from "../../packages/themes/tech/src/index.ts";
import { buildDirectiveMarkdown } from "./directive-markdown-fixtures.ts";

const ALL_THEMES = [
  { id: "default", theme: defaultTheme },
  { id: "business", theme: businessTheme },
  { id: "literary", theme: literaryTheme },
  { id: "magazine", theme: magazineTheme },
  { id: "tech", theme: techTheme },
];

beforeAll(() => {
  for (const { theme } of ALL_THEMES) {
    registerTheme(theme);
  }
});

function buildCodeBlockMarkdown(variantId: string): string {
  return `:::code-block{.${variantId}}\n\`\`\`js\nconst x = 1;\n\`\`\`\n:::`;
}

function parseStyleDict(style: string | undefined): Record<string, string> {
  const dict: Record<string, string> = {};
  if (typeof style !== "string") return dict;
  for (const decl of style.split(";")) {
    const trimmed = decl.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    dict[trimmed.slice(0, idx).trim().toLowerCase()] = trimmed.slice(idx + 1).trim();
  }
  return dict;
}

async function renderCodeBlockStyles(
  variantId: string,
  themeId = "default"
): Promise<{ preStyle: Record<string, string>; codeStyle: Record<string, string>; html: string }> {
  const { html } = await renderMarkdown(buildCodeBlockMarkdown(variantId), { themeId });
  const preMatch = html.match(/<pre[^>]*style="([^"]*)"/);
  const codeMatch = html.match(/<code[^>]*style="([^"]*)"/);
  return {
    preStyle: parseStyleDict(preMatch?.[1]),
    codeStyle: parseStyleDict(codeMatch?.[1]),
    html,
  };
}

describe("AC-001: code-block.minimal root 不含外框声明，纯 pre/code 呈现", () => {
  it("minimal 的 pre 不含 border 声明（缺省或 none）", async () => {
    const { preStyle } = await renderCodeBlockStyles("minimal");
    const border = preStyle.border;
    expect(border === undefined || border.toLowerCase() === "none").toBe(true);
  });

  it("minimal 的 pre 不含卡片化 background（缺省或 transparent）", async () => {
    const { preStyle } = await renderCodeBlockStyles("minimal");
    const bg = preStyle.background ?? preStyle["background-color"];
    expect(bg === undefined || bg.toLowerCase() === "transparent").toBe(true);
  });

  it("minimal 与 default 的 pre background-color 不同（真实去卡片化，非无操作）", async () => {
    const { preStyle: defaultPre } = await renderCodeBlockStyles("default");
    const { preStyle: minimalPre } = await renderCodeBlockStyles("minimal");
    expect(minimalPre["background-color"]).not.toBe(defaultPre["background-color"]);
  });

  it("root 不含外框声明（section 本身从未携带 border/background，minimal 未新增）", async () => {
    const { html } = await renderCodeBlockStyles("minimal");
    const rootMatch = html.match(/<section data-block="code-block"[^>]*>/);
    expect(rootMatch).not.toBeNull();
    expect(rootMatch?.[0]).not.toContain("style=");
  });
});

describe("AC-002: code-block.light 引入浅色语法高亮 token 集，与主题 token 机制对齐", () => {
  it("light 的 pre/code background-color 引用主题 token 解析出的浅色值（default 主题）", async () => {
    const { preStyle, codeStyle } = await renderCodeBlockStyles("light", "default");
    expect(preStyle["background-color"]).toBe("#fbfaf7");
    expect(codeStyle["background-color"]).toBe("#fbfaf7");
    expect(preStyle.color).toBe("#292524");
  });

  it("5 主题的 light 变体各自解析出不同的浅色 background-color 值（非跨主题字节相同）", async () => {
    const results = await Promise.all(
      ALL_THEMES.map(async ({ id }) => {
        const { preStyle } = await renderCodeBlockStyles("light", id);
        return preStyle["background-color"];
      })
    );
    const unique = new Set(results);
    expect(results.every((v) => typeof v === "string" && v.length > 0)).toBe(true);
    expect(unique.size).toBe(ALL_THEMES.length);
  });

  it("tech 主题 light 变体渲染为真正浅色（与 tech 自身暗色 default 代码块形成鲜明对比）", async () => {
    const { preStyle: techLight } = await renderCodeBlockStyles("light", "tech");
    const { preStyle: techDefault } = await renderCodeBlockStyles("default", "tech");
    expect(techLight["background-color"]).not.toBe(techDefault["background-color"]);
    // tech light 背景应为浅色（十六进制三通道均较高）
    const hex = techLight["background-color"]?.replace("#", "") ?? "000000";
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    expect(r).toBeGreaterThan(200);
    expect(g).toBeGreaterThan(200);
    expect(b).toBeGreaterThan(200);
  });

  it("light 变体的 token 引用方式与主题既有语法高亮 token 体系一致（均为 --color-code-* 命名族）", () => {
    const def = describeBlock("code-block");
    const lightVariant = def?.variants.find((v) => v.id === "light");
    const preDecl = lightVariant?.baseStyle?.pre ?? {};
    for (const value of Object.values(preDecl)) {
      expect(value).toMatch(/^var\(--color-code-/);
    }
  });
});

describe("AC-003: 2 变体满足谓词①，差分守卫不判定为 finding", () => {
  it("runVariantDiffGuard 不将 code-block.minimal/light 判定为渲染同 default 的 finding", async () => {
    const findings = await runVariantDiffGuard({
      buildMarkdown: (blockId, variantId) =>
        blockId === "code-block"
          ? buildCodeBlockMarkdown(variantId)
          : buildDirectiveMarkdown(blockId, variantId),
      themeId: "default",
    });
    const findingKeys = new Set(findings.map((f) => `${f.blockId}::${f.variantId}`));
    expect(findingKeys.has("code-block::minimal")).toBe(false);
    expect(findingKeys.has("code-block::light")).toBe(false);
  });

  it("minimal/light 均具备自身 baseStyle delta（诚实实现标记，不依赖 decorate 兜底豁免）", () => {
    const def = describeBlock("code-block");
    for (const variantId of ["minimal", "light"]) {
      const variant = def?.variants.find((v) => v.id === variantId);
      const hasOwnDelta = Boolean(
        variant?.baseStyle &&
          Object.values(variant.baseStyle).some((slot) => Object.keys(slot).length > 0)
      );
      expect(hasOwnDelta).toBe(true);
    }
  });
});

describe("回归: code-block.default 与裸 fenced code 渲染不受本次新增变体影响", () => {
  it("default 变体渲染的 pre/code 仍走既有主题 Tag-path 样式（未被 slot 机制接管）", async () => {
    const { html } = await renderCodeBlockStyles("default");
    expect(html).not.toContain("data-block-slot");
  });

  it("裸 fenced code（非 directive）渲染不受 code-block 变体新增影响", async () => {
    const { html } = await renderMarkdown("```js\nconst x = 1;\n```", { themeId: "default" });
    const preMatch = html.match(/<pre[^>]*style="([^"]*)"/);
    const style = parseStyleDict(preMatch?.[1]);
    expect(style["background-color"]).toBe("#f0ede8");
  });
});
