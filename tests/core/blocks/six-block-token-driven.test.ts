import { beforeAll, describe, expect, it } from "vitest";
import { registerTheme, renderMarkdown } from "../../../packages/core/src/index.ts";
import "../../../packages/blocks/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";
import literaryTheme from "../../../packages/themes/literary/src/index.ts";
import techTheme from "../../../packages/themes/tech/src/index.ts";

beforeAll(() => {
  registerTheme(defaultTheme);
  registerTheme(literaryTheme);
  registerTheme(techTheme);
});

const THEME_IDS = [defaultTheme.id, literaryTheme.id, techTheme.id];

const SURFACE_ALT: Record<string, string> = {
  default: "#f3f0eb",
  literary: "#f2ece0",
  tech: "#21262d",
};

const TEXT_SECONDARY: Record<string, string> = {
  default: "#44403c",
  literary: "#5a4228",
  tech: "#8b949e",
};

const TEXT_MUTED: Record<string, string> = {
  default: "#78716c",
  literary: "#8a7050",
  tech: "#6e7681",
};

const CODE_BG: Record<string, string> = {
  default: "#f0ede8",
  literary: "#f2ece0",
  tech: "#1a1a2e",
};

const TEXT_PRIMARY: Record<string, string> = {
  default: "#1c1917",
  literary: "#2c1f0a",
  tech: "#e6edf3",
};

const BRAND: Record<string, string> = {
  default: "#2d5a4e",
  literary: "#7b4f2e",
  tech: "#58a6ff",
};

const TEXT_INVERSE: Record<string, string> = {
  default: "#fafaf9",
  literary: "#f9f5ee",
  tech: "#0f1117",
};

const ACCENT: Record<string, string> = {
  default: "#b94a3e",
  literary: "#5c7a5a",
  tech: "#3fb950",
};

function expectTokenDriven(actual: Record<string, string>, expected: Record<string, string>): void {
  for (const themeId of THEME_IDS) {
    expect(actual[themeId], `theme ${themeId}`).toBe(expected[themeId]);
  }
  expect(new Set(THEME_IDS.map((id) => actual[id])).size).toBe(THEME_IDS.length);
}

function extractRootStyle(html: string, blockId: string, variantId: string): string {
  const re = new RegExp(
    `<section data-block="${blockId}" data-variant="${variantId}"[^>]* style="([^"]*)"`
  );
  const match = html.match(re);
  expect(match, `no ${blockId}/${variantId} root found in html: ${html}`).not.toBeNull();
  return match?.[1] ?? "";
}

function extractSlotStyleByMarker(html: string, marker: string): string {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<section style="([^"]*)">[^<]*${escaped}[^<]*</section>`);
  const match = html.match(re);
  expect(match, `no slot section containing "${marker}" found in html: ${html}`).not.toBeNull();
  return match?.[1] ?? "";
}

function extractHexAfter(style: string, prop: string): string {
  const re = new RegExp(`${prop}:\\s*[^;]*?(#[0-9a-fA-F]{6})`);
  const match = style.match(re);
  expect(match, `no ${prop} hex color found in style: ${style}`).not.toBeNull();
  return match?.[1] ?? "";
}

const STEPS_MD = `:::steps{.card}
- **步骤一**：说明文字
:::`;

describe("AC-006/007: steps card 变体 root.background 与 description.color 随主题 token 变化", () => {
  it("root.background 三主题分别等于 --color-surface-alt 权威值且互不相同", async () => {
    const actual: Record<string, string> = {};
    for (const themeId of THEME_IDS) {
      const result = await renderMarkdown(STEPS_MD, { themeId });
      const style = extractRootStyle(result.html, "steps", "card");
      actual[themeId] = extractHexAfter(style, "background");
    }
    expectTokenDriven(actual, SURFACE_ALT);
  });

  it("description slot 计算 color 三主题分别等于 --color-text-secondary 权威值且互不相同", async () => {
    const actual: Record<string, string> = {};
    for (const themeId of THEME_IDS) {
      const result = await renderMarkdown(STEPS_MD, { themeId });
      const style = extractSlotStyleByMarker(result.html, "说明文字");
      actual[themeId] = extractHexAfter(style, "color");
    }
    expectTokenDriven(actual, TEXT_SECONDARY);
  });
});

const GALLERY_MD = `:::gallery{.duo}
- ![图一](https://example.com/a.png "图注说明")
- ![图二](https://example.com/b.png)
:::`;

describe("AC-006/007: gallery duo 变体 caption.color 随主题 token 变化", () => {
  it("caption.color 三主题分别等于 --color-text-muted 权威值且互不相同", async () => {
    const actual: Record<string, string> = {};
    for (const themeId of THEME_IDS) {
      const result = await renderMarkdown(GALLERY_MD, { themeId });
      const style = extractSlotStyleByMarker(result.html, "图注说明");
      actual[themeId] = extractHexAfter(style, "color");
    }
    expectTokenDriven(actual, TEXT_MUTED);
  });
});

const COMPARE_MD =
  ':::compare{.ledger left-label="优点" left-value="速度快指标" right-label="缺点" right-value="成本高指标"}\n:::';

describe("AC-006/007: compare ledger 变体 left/right.background 随主题 token 变化", () => {
  it("left.background 三主题分别等于 --color-surface-alt 权威值且互不相同", async () => {
    const actual: Record<string, string> = {};
    for (const themeId of THEME_IDS) {
      const result = await renderMarkdown(COMPARE_MD, { themeId });
      const style = extractSlotStyleByMarker(result.html, "速度快指标");
      actual[themeId] = extractHexAfter(style, "background");
    }
    expectTokenDriven(actual, SURFACE_ALT);
  });

  it("right.background 三主题分别等于 --color-code-bg 权威值且互不相同", async () => {
    const actual: Record<string, string> = {};
    for (const themeId of THEME_IDS) {
      const result = await renderMarkdown(COMPARE_MD, { themeId });
      const style = extractSlotStyleByMarker(result.html, "成本高指标");
      actual[themeId] = extractHexAfter(style, "background");
    }
    expectTokenDriven(actual, CODE_BG);
  });
});

const DIALOG_MD = [
  ':::dialog{.chat-bubbles speaker="对方"}',
  "你好呀东家",
  ":::",
  "",
  ':::dialog{.chat-bubbles speaker="己方"}',
  "你好呀西家",
  ":::",
].join("\n");

function extractBubbleContainerStyles(html: string): string[] {
  const matches = [...html.matchAll(/<section style="([^"]*)"/g)].filter((m) =>
    m[1].includes("background:")
  );
  return matches.map((m) => m[1]);
}

describe("AC-006/007: dialog chat-bubbles 变体左右气泡 background/color 随主题 token 变化", () => {
  it("左侧气泡（首位 speaker）background 三主题分别等于 --color-surface-alt 权威值且互不相同", async () => {
    const actual: Record<string, string> = {};
    for (const themeId of THEME_IDS) {
      const result = await renderMarkdown(DIALOG_MD, { themeId });
      const styles = extractBubbleContainerStyles(result.html);
      actual[themeId] = extractHexAfter(styles[0] ?? "", "background");
    }
    expectTokenDriven(actual, SURFACE_ALT);
  });

  it("左侧气泡文字色 三主题分别等于 --color-text-primary 权威值且互不相同", async () => {
    const actual: Record<string, string> = {};
    for (const themeId of THEME_IDS) {
      const result = await renderMarkdown(DIALOG_MD, { themeId });
      const styles = extractBubbleContainerStyles(result.html);
      actual[themeId] = extractHexAfter(styles[0] ?? "", "color");
    }
    expectTokenDriven(actual, TEXT_PRIMARY);
  });

  it("右侧气泡（次位不同 speaker）background 三主题分别等于 --color-brand 权威值且互不相同", async () => {
    const actual: Record<string, string> = {};
    for (const themeId of THEME_IDS) {
      const result = await renderMarkdown(DIALOG_MD, { themeId });
      const styles = extractBubbleContainerStyles(result.html);
      actual[themeId] = extractHexAfter(styles[1] ?? "", "background");
    }
    expectTokenDriven(actual, BRAND);
  });

  it("右侧气泡文字色 三主题分别等于 --color-text-inverse 权威值且互不相同", async () => {
    const actual: Record<string, string> = {};
    for (const themeId of THEME_IDS) {
      const result = await renderMarkdown(DIALOG_MD, { themeId });
      const styles = extractBubbleContainerStyles(result.html);
      actual[themeId] = extractHexAfter(styles[1] ?? "", "color");
    }
    expectTokenDriven(actual, TEXT_INVERSE);
  });
});

const CALLOUT_MD = ":::callout{.tip}\n提示内容\n:::";

describe("AC-006/007: callout tip 变体 root.background 与 box-shadow 内嵌色随主题 token 变化", () => {
  it("root.background 三主题分别等于 --color-surface-alt 权威值且互不相同", async () => {
    const actual: Record<string, string> = {};
    for (const themeId of THEME_IDS) {
      const result = await renderMarkdown(CALLOUT_MD, { themeId });
      const style = extractRootStyle(result.html, "callout", "tip");
      actual[themeId] = extractHexAfter(style, "background");
    }
    expectTokenDriven(actual, SURFACE_ALT);
  });

  it("box-shadow 内嵌色值三主题分别等于 --color-brand 权威值且互不相同", async () => {
    const actual: Record<string, string> = {};
    for (const themeId of THEME_IDS) {
      const result = await renderMarkdown(CALLOUT_MD, { themeId });
      const style = extractRootStyle(result.html, "callout", "tip");
      actual[themeId] = extractHexAfter(style, "box-shadow");
    }
    expectTokenDriven(actual, BRAND);
  });
});

const ANNOUNCEMENT_MD = ":::announcement{.danger-bar}\n重要通知内容\n:::";

describe("AC-006/007: announcement danger-bar 变体 root.background 与 border-top 内嵌色随主题 token 变化", () => {
  it("root.background 三主题分别等于 --color-surface-alt 权威值且互不相同", async () => {
    const actual: Record<string, string> = {};
    for (const themeId of THEME_IDS) {
      const result = await renderMarkdown(ANNOUNCEMENT_MD, { themeId });
      const style = extractRootStyle(result.html, "announcement", "danger-bar");
      actual[themeId] = extractHexAfter(style, "background");
    }
    expectTokenDriven(actual, SURFACE_ALT);
  });

  it("border-top 内嵌色值三主题分别等于 --color-accent 权威值且互不相同", async () => {
    const actual: Record<string, string> = {};
    for (const themeId of THEME_IDS) {
      const result = await renderMarkdown(ANNOUNCEMENT_MD, { themeId });
      const style = extractRootStyle(result.html, "announcement", "danger-bar");
      actual[themeId] = extractHexAfter(style, "border-top");
    }
    expectTokenDriven(actual, ACCENT);
  });
});

describe("AC-007: 六块渲染产物（default 主题）无 var() 残留", () => {
  it("六块渲染产物拼接后不含 var( 残留", async () => {
    const markdowns = [STEPS_MD, GALLERY_MD, COMPARE_MD, DIALOG_MD, CALLOUT_MD, ANNOUNCEMENT_MD];
    for (const md of markdowns) {
      const result = await renderMarkdown(md, { themeId: "default" });
      expect(result.html).not.toContain("var(");
    }
  });
});
