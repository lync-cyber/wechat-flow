import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import type { ThemeBlocks, ThemeDefinition } from "../../../packages/contracts/src/index.ts";
import type {
  BlockDefinition,
  MarkDefinition,
  RejectedDeclaration,
} from "../../../packages/core/src/index.ts";
import {
  listBlocks,
  listMarks,
  listThemes,
  registerBlock,
  registerMark,
  registerTheme,
  resetBlockRegistry,
  resetMarkRegistry,
  resetThemeRegistry,
} from "../../../packages/core/src/index.ts";
import { parseMarkStyleDeclarations } from "../../../packages/core/src/registry/style-guard.ts";
import "../../../packages/blocks/src/index.ts";
import "../../../packages/marks/src/index.ts";
import { badge } from "../../../packages/marks/src/marks/badge.ts";
import { emphasis } from "../../../packages/marks/src/marks/emphasis.ts";
import businessTheme from "../../../packages/themes/business/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";
import literaryTheme from "../../../packages/themes/literary/src/index.ts";
import magazineTheme from "../../../packages/themes/magazine/src/index.ts";
import techTheme from "../../../packages/themes/tech/src/index.ts";

interface GuardError extends Error {
  rejectedDeclarations?: RejectedDeclaration[];
}

function expectRejected(register: () => void): RejectedDeclaration[] {
  try {
    register();
  } catch (err) {
    const rejected = (err as GuardError).rejectedDeclarations;
    expect(Array.isArray(rejected), "error must carry .rejectedDeclarations array").toBe(true);
    return rejected as RejectedDeclaration[];
  }
  throw new Error("expected register() to throw a structured rejection error, but it did not");
}

function buildProbeBlock(
  overrides: Partial<Pick<BlockDefinition, "baseStyle" | "variants">>
): BlockDefinition {
  return {
    id: "guard-probe-block",
    name: "守卫探针块",
    category: "text",
    directiveAttrs: z.object({}).strict(),
    variants: [],
    slots: ["root"],
    ...overrides,
  };
}

describe("AC-001: registerBlock 构造期 FORBIDDEN 样式守卫", () => {
  beforeEach(() => {
    resetBlockRegistry();
  });

  it.each([
    ["display", "flex"],
    ["display", "inline-flex"],
    ["display", "grid"],
    ["position", "absolute"],
    ["font-family", "sans-serif"],
    ["float", "left"],
  ])(
    "root baseStyle 含 %s:%s 时 registerBlock 抛出并携带 rejectedDeclarations",
    (property, value) => {
      const rejected = expectRejected(() =>
        registerBlock(buildProbeBlock({ baseStyle: { root: { [property]: value } } }))
      );
      expect(rejected).toContainEqual(expect.objectContaining({ property, value }));
    }
  );

  it("variant.baseStyle 含 position:absolute 时 registerBlock 抛出并携带 rejectedDeclarations", () => {
    const rejected = expectRejected(() =>
      registerBlock(
        buildProbeBlock({
          variants: [
            {
              id: "probe-variant",
              label: "探针变体",
              baseStyle: { root: { position: "absolute" } },
            },
          ],
        })
      )
    );
    expect(rejected).toContainEqual(expect.objectContaining({ property: "position" }));
  });

  it("root baseStyle 全为安全声明时 registerBlock 不抛出且块可被列出", () => {
    expect(() =>
      registerBlock(
        buildProbeBlock({
          baseStyle: { root: { color: "#222222", "font-size": "16px", display: "inline-block" } },
        })
      )
    ).not.toThrow();
    expect(listBlocks().some((b) => b.id === "guard-probe-block")).toBe(true);
  });
});

function buildProbeTheme(
  blocks: ThemeBlocks,
  tokens: Record<string, string> = {}
): ThemeDefinition {
  return {
    id: "guard-probe-theme",
    name: "守卫探针主题",
    tokens,
    blocks,
  };
}

describe("AC-002: registerTheme 构造期 FORBIDDEN 样式守卫", () => {
  beforeEach(() => {
    resetThemeRegistry();
  });

  it.each([
    ["display", "grid"],
    ["display", "inline-grid"],
    ["position", "absolute"],
    ["float", "right"],
  ])(
    "theme.blocks 声明表含 %s:%s 时 registerTheme 抛出并携带 rejectedDeclarations",
    (property, value) => {
      const rejected = expectRejected(() =>
        registerTheme(buildProbeTheme({ callout: { default: { [property]: value } } }))
      );
      expect(rejected).toContainEqual(expect.objectContaining({ property, value }));
    }
  );

  it("theme.blocks 声明表全为安全声明时 registerTheme 不抛出且主题可被列出", () => {
    expect(() =>
      registerTheme(buildProbeTheme({ callout: { default: { color: "#333333", padding: "8px" } } }))
    ).not.toThrow();
    expect(listThemes().some((t) => t.id === "guard-probe-theme")).toBe(true);
  });

  it("theme.tokens 含禁用 display 值时 registerTheme 抛出并携带 rejectedDeclarations", () => {
    const rejected = expectRejected(() =>
      registerTheme(buildProbeTheme({}, { "--x-display": "flex" }))
    );
    expect(rejected).toContainEqual(
      expect.objectContaining({ slot: "tokens", property: "--x-display", value: "flex" })
    );
  });

  it("theme.tokens 含 -webkit- 前缀值时 registerTheme 抛出并携带 rejectedDeclarations", () => {
    const rejected = expectRejected(() =>
      registerTheme(buildProbeTheme({}, { "--shadow": "0 0 4px; -webkit-box-shadow: red" }))
    );
    expect(rejected.some((r) => r.property === "--shadow")).toBe(true);
  });

  it("theme.tokens 为合法值（含字体栈）时 registerTheme 不抛出", () => {
    expect(() =>
      registerTheme(
        buildProbeTheme(
          {},
          {
            "--color-brand": "#2D5A4E",
            "--font-family-heading": "'LXGW WenKai', 'Source Han Serif CN', serif",
          }
        )
      )
    ).not.toThrow();
    expect(listThemes().some((t) => t.id === "guard-probe-theme")).toBe(true);
  });
});

function buildProbeMark(style: string): MarkDefinition {
  return { id: "guard-probe-mark", name: "守卫探针标记", style };
}

describe("AC-003: registerMark 构造期 FORBIDDEN 样式守卫", () => {
  beforeEach(() => {
    resetMarkRegistry();
  });

  it("style 字符串含 position:absolute 时 registerMark 抛出并携带 rejectedDeclarations", () => {
    const rejected = expectRejected(() =>
      registerMark(buildProbeMark("position: absolute; color: #000000"))
    );
    expect(rejected).toContainEqual(expect.objectContaining({ property: "position" }));
  });

  it("style 字符串含非例外白名单 -webkit-box-shadow 时 registerMark 抛出并携带 rejectedDeclarations", () => {
    const rejected = expectRejected(() =>
      registerMark(buildProbeMark("-webkit-box-shadow: 0 0 4px rgba(0,0,0,.5); color: #000000"))
    );
    expect(rejected.length).toBeGreaterThan(0);
    expect(rejected.some((r) => r.value.includes("-webkit-box-shadow"))).toBe(true);
  });

  it("emphasis 内置 mark 的真实 style（含例外白名单 -webkit-text-emphasis）注册不抛出", () => {
    expect(() =>
      registerMark({ id: "guard-probe-emphasis-safe", name: emphasis.name, style: emphasis.style })
    ).not.toThrow();
    expect(listMarks().some((m) => m.id === "guard-probe-emphasis-safe")).toBe(true);
  });

  it("badge 内置 mark 的真实 style（含合法 display:inline-block）注册不抛出", () => {
    expect(() =>
      registerMark({ id: "guard-probe-badge-safe", name: badge.name, style: badge.style })
    ).not.toThrow();
    expect(listMarks().some((m) => m.id === "guard-probe-badge-safe")).toBe(true);
  });

  it("R-006: style 字符串含大写 -WEBKIT-BOX-SHADOW（非例外白名单）时 registerMark 仍抛出", () => {
    const rejected = expectRejected(() =>
      registerMark(buildProbeMark("-WEBKIT-BOX-SHADOW: 0 0 4px rgba(0,0,0,.5); color: #000000"))
    );
    expect(rejected.length).toBeGreaterThan(0);
  });

  it("R-006: emphasis 例外白名单声明的大写变体（-WEBKIT-TEXT-EMPHASIS）注册不抛出，不因大小写归一化被误杀", () => {
    expect(() =>
      registerMark(
        buildProbeMark(
          "TEXT-EMPHASIS: filled circle; TEXT-EMPHASIS-POSITION: under left; -WEBKIT-TEXT-EMPHASIS: filled circle"
        )
      )
    ).not.toThrow();
    expect(listMarks().some((m) => m.id === "guard-probe-mark")).toBe(true);
  });
});

describe("AC-006: 内置资产经注册路径重放守卫零拒绝", () => {
  it("全部内置 Block 经 registerBlock 重放不抛出且零 rejectedDeclarations", () => {
    const errors: Array<{ id: string; rejectedDeclarations?: RejectedDeclaration[] }> = [];
    for (const block of listBlocks()) {
      try {
        registerBlock(block);
      } catch (err) {
        errors.push({
          id: block.id,
          rejectedDeclarations: (err as GuardError).rejectedDeclarations,
        });
      }
    }
    expect(errors).toEqual([]);
    expect(listBlocks().length).toBeGreaterThanOrEqual(30);
  });

  it("全部内置 Mark 经 registerMark 重放不抛出且零 rejectedDeclarations", () => {
    const errors: Array<{ id: string; rejectedDeclarations?: RejectedDeclaration[] }> = [];
    for (const mark of listMarks()) {
      try {
        registerMark(mark);
      } catch (err) {
        errors.push({
          id: mark.id,
          rejectedDeclarations: (err as GuardError).rejectedDeclarations,
        });
      }
    }
    expect(errors).toEqual([]);
    expect(listMarks().length).toBeGreaterThanOrEqual(10);
  });

  it("全部内置主题 blocks 声明表经 registerTheme 重放不抛出且零 rejectedDeclarations", () => {
    const themes = [defaultTheme, literaryTheme, techTheme, businessTheme, magazineTheme];
    const errors: Array<{ id: string; rejectedDeclarations?: RejectedDeclaration[] }> = [];
    for (const theme of themes) {
      try {
        registerTheme(theme);
      } catch (err) {
        errors.push({
          id: theme.id,
          rejectedDeclarations: (err as GuardError).rejectedDeclarations,
        });
      }
    }
    expect(errors).toEqual([]);
    expect(listThemes().length).toBeGreaterThanOrEqual(5);
  });
});

describe("AC-007: 构造期守卫负向探针证明真实拦截", () => {
  beforeEach(() => {
    resetBlockRegistry();
    resetThemeRegistry();
    resetMarkRegistry();
  });

  it("同一守卫路径对违规声明拒绝、对合法在用声明放行（block/theme/mark 三线合一验证）", () => {
    expect(() =>
      registerBlock(buildProbeBlock({ baseStyle: { root: { display: "flex" } } }))
    ).toThrow();
    expect(() =>
      registerBlock(buildProbeBlock({ baseStyle: { root: { display: "inline-block" } } }))
    ).not.toThrow();

    expect(() =>
      registerTheme(buildProbeTheme({ callout: { default: { position: "absolute" } } }))
    ).toThrow();
    expect(() =>
      registerTheme(buildProbeTheme({ callout: { default: { "background-color": "#fff" } } }))
    ).not.toThrow();

    expect(() => registerMark(buildProbeMark("float: left"))).toThrow();
    expect(() =>
      registerMark({
        id: "guard-probe-emphasis-effectiveness",
        name: emphasis.name,
        style: emphasis.style,
      })
    ).not.toThrow();
  });
});

describe("parseMarkStyleDeclarations 边界解析", () => {
  it("空字符串解析为空对象", () => {
    expect(parseMarkStyleDeclarations("")).toEqual({});
  });

  it("含空片段的声明表跳过空片段并解析剩余声明", () => {
    expect(parseMarkStyleDeclarations("color: red; ; font-size: 14px")).toEqual({
      color: "red",
      "font-size": "14px",
    });
  });

  it("无冒号的片段被跳过", () => {
    expect(parseMarkStyleDeclarations("garbage")).toEqual({});
  });
});
