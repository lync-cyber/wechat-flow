import { beforeEach, describe, expect, it } from "vitest";
import { renderMarkdown } from "../../packages/core/src/index.ts";
import { mergeDelta } from "../../packages/core/src/inheritance/delta-merge.ts";
import { registerTheme, resetThemeRegistry } from "../../packages/core/src/registry/theme.ts";

beforeEach(() => {
  resetThemeRegistry();
});

describe("AC-001: delta-merge — extends + delta tokens 覆盖 blocks 中的颜色值", () => {
  it("delta 覆盖 brand color 后 HTML 含新值，继承未改 token 仍为父值", async () => {
    registerTheme({
      id: "parent-theme",
      name: "Parent",
      tokens: {
        "--color-brand": "#0066cc",
        "--color-text": "#333333",
      },
      blocks: {
        h1: {
          default: {
            color: "#0066cc",
            "font-size": "22px",
          },
        },
        p: {
          default: {
            color: "#333333",
            "font-size": "15px",
          },
        },
      },
      paintable: [],
    });

    registerTheme({
      id: "org-theme",
      name: "Org Brand",
      tokens: {
        "--color-brand": "#003366",
        "--color-text": "#333333",
      },
      extends: "parent-theme",
      delta: {
        tokens: {
          "--color-brand": "#003366",
        },
      },
    } as Parameters<typeof registerTheme>[0]);

    const result = await renderMarkdown("# Hello", { themeId: "org-theme" });

    // delta 覆盖 brand color → h1 color 应变为 #003366
    expect(result.html).toContain("003366");
    // 父主题继承的 #333333 未被 delta 改动 → p 颜色仍保留（同或在 blocks）
    // h1 font-size 继承父主题 22px
    expect(result.html).toContain("22px");
    // 不应含旧品牌色 #0066cc（已被替换）
    expect(result.html).not.toContain("0066cc");
  });

  it("无 extends 的主题行为不变（零回归）", async () => {
    registerTheme({
      id: "standalone",
      name: "Standalone",
      tokens: { "--color-brand": "#aabbcc" },
      blocks: {
        h1: { default: { color: "#aabbcc", "font-size": "20px" } },
      },
    });

    const result = await renderMarkdown("# Test", { themeId: "standalone" });
    expect(result.html).toContain("aabbcc");
    expect(result.html).toContain("20px");
  });
});

describe("mergeDelta — direct unit tests for uncovered branches", () => {
  it("returns undefined when themeId is not found", () => {
    const result = mergeDelta("nonexistent", () => undefined);
    expect(result).toBeUndefined();
  });

  it("returns theme as-is when theme has no extends", () => {
    const theme = {
      id: "base",
      name: "Base",
      tokens: { "--color-brand": "#111111" },
      blocks: { h1: { default: { color: "#111111" } } },
    };
    const result = mergeDelta("base", (id) => (id === "base" ? theme : undefined));
    expect(result).toBe(theme);
  });

  it("returns child theme when parent lookup returns undefined", () => {
    const child = {
      id: "child",
      name: "Child",
      extends: "missing-parent",
      tokens: { "--color-brand": "#222222" },
      blocks: { h1: { default: { color: "#222222" } } },
    };
    const result = mergeDelta("child", (id) => (id === "child" ? child : undefined));
    expect(result).toBe(child);
  });

  it("merges when token oldValue is undefined — no value replacement entry added", () => {
    const parent = {
      id: "parent",
      name: "Parent",
      tokens: { "--color-brand": "#0000ff" },
      blocks: { h1: { default: { color: "#0000ff" } } },
    };
    const child = {
      id: "child",
      name: "Child",
      extends: "parent",
      tokens: {},
      delta: {
        tokens: { "--new-token": "#abcdef" },
      },
    };
    const lookup = (id: string) => (id === "parent" ? parent : id === "child" ? child : undefined);
    const result = mergeDelta("child", lookup);
    expect(result).toBeDefined();
    expect(result?.tokens["--new-token"]).toBe("#abcdef");
    expect(result?.blocks?.h1?.default?.color).toBe("#0000ff");
  });

  it("skips value replacement when old token value equals new value (oldValue === newValue)", () => {
    const parent = {
      id: "parent",
      name: "Parent",
      tokens: { "--color-brand": "#003366" },
      blocks: { h1: { default: { color: "#003366" } } },
    };
    const child = {
      id: "child",
      name: "Child",
      extends: "parent",
      tokens: {},
      delta: {
        tokens: { "--color-brand": "#003366" },
      },
    };
    const lookup = (id: string) => (id === "parent" ? parent : id === "child" ? child : undefined);
    const result = mergeDelta("child", lookup);
    expect(result).toBeDefined();
    expect(result?.blocks?.h1?.default?.color).toBe("#003366");
  });

  it("merges blocks from parent when child delta has no blocks", () => {
    const parent = {
      id: "parent",
      name: "Parent",
      tokens: { "--color-brand": "#0055aa" },
      blocks: { p: { default: { color: "#0055aa" } } },
    };
    const child = {
      id: "child",
      name: "Child",
      extends: "parent",
      tokens: {},
      delta: { tokens: { "--color-brand": "#ee4422" } },
    };
    const lookup = (id: string) => (id === "parent" ? parent : id === "child" ? child : undefined);
    const result = mergeDelta("child", lookup);
    expect(result).toBeDefined();
    expect(result?.blocks?.p?.default?.color).toBe("#ee4422");
  });

  it("inherits parent.paintable when child delta has no paintable", () => {
    const parent = {
      id: "parent",
      name: "Parent",
      tokens: {},
      paintable: ["--color-brand"],
    };
    const child = {
      id: "child",
      name: "Child",
      extends: "parent",
      tokens: {},
      delta: { tokens: {} },
    };
    const lookup = (id: string) => (id === "parent" ? parent : id === "child" ? child : undefined);
    const result = mergeDelta("child", lookup);
    expect(result?.paintable).toEqual(["--color-brand"]);
  });

  it("uses child delta.paintable when provided, overriding parent paintable", () => {
    const parent = {
      id: "parent",
      name: "Parent",
      tokens: {},
      paintable: ["--color-brand"],
    };
    const child = {
      id: "child",
      name: "Child",
      extends: "parent",
      tokens: {},
      delta: { tokens: {}, paintable: ["--color-accent"] },
    };
    const lookup = (id: string) => (id === "parent" ? parent : id === "child" ? child : undefined);
    const result = mergeDelta("child", lookup);
    expect(result?.paintable).toEqual(["--color-accent"]);
  });

  it("merges when parent has no blocks — treats as empty blocks", () => {
    const parent = {
      id: "parent",
      name: "Parent",
      tokens: { "--color-brand": "#0055aa" },
    };
    const child = {
      id: "child",
      name: "Child",
      extends: "parent",
      tokens: {},
      delta: {
        tokens: {},
        blocks: { h1: { default: { color: "#0055aa" } } },
      },
    };
    const lookup = (id: string) => (id === "parent" ? parent : id === "child" ? child : undefined);
    const result = mergeDelta("child", lookup);
    expect(result).toBeDefined();
    expect(result?.blocks?.h1?.default?.color).toBe("#0055aa");
  });

  it("merges valueReplacement across multiple blocks with matching CSS values", () => {
    const parent = {
      id: "parent",
      name: "Parent",
      tokens: { "--color-brand": "#aabbcc" },
      blocks: {
        h1: { default: { color: "#aabbcc", "font-size": "20px" } },
        h2: { default: { color: "#aabbcc", "font-weight": "bold" } },
      },
    };
    const child = {
      id: "child",
      name: "Child",
      extends: "parent",
      tokens: {},
      delta: { tokens: { "--color-brand": "#112233" } },
    };
    const lookup = (id: string) => (id === "parent" ? parent : id === "child" ? child : undefined);
    const result = mergeDelta("child", lookup);
    expect(result?.blocks?.h1?.default?.color).toBe("#112233");
    expect(result?.blocks?.h2?.default?.color).toBe("#112233");
    expect(result?.blocks?.h1?.default?.["font-size"]).toBe("20px");
  });
});

describe("AC-002: brand-pack lock — paint 尝试覆盖锁定 token 被忽略并产生 warning diagnostic", () => {
  it("锁定 token 被 paint 覆盖 → HTML 保留品牌原值，diagnostics 含 brand-pack-locked-token warning", async () => {
    registerTheme({
      id: "branded",
      name: "Branded",
      tokens: {
        "--color-brand": "#003366",
      },
      blocks: {
        h1: {
          default: {
            color: "#003366",
            "font-size": "22px",
          },
        },
      },
      paintable: ["--color-brand"],
      brandPack: {
        lockedTokens: ["--color-brand"],
      },
    } as Parameters<typeof registerTheme>[0]);

    const markdown = `---
theme: branded
paint:
  "--color-brand": "#ff0000"
---
# Hello`;

    const result = await renderMarkdown(markdown);

    // 品牌色被锁定 → 覆盖被忽略 → HTML 仍含原值 #003366
    expect(result.html).toContain("003366");
    // 覆盖色 #ff0000 不应出现在 HTML
    expect(result.html).not.toContain("ff0000");

    // diagnostics 含 brand-pack-locked-token warning
    const brandWarning = result.diagnostics.find((d) => d.ruleId === "brand-pack-locked-token");
    expect(brandWarning).toBeDefined();
    expect(brandWarning?.severity).toBe("warning");
  });

  it("未锁定的 paintable token 仍可正常被 paint 覆盖", async () => {
    registerTheme({
      id: "semi-locked",
      name: "Semi Locked",
      tokens: {
        "--color-brand": "#003366",
        "--color-accent": "#ff6600",
      },
      blocks: {
        h1: {
          default: {
            color: "#003366",
            "font-size": "22px",
          },
        },
        p: {
          default: {
            color: "#ff6600",
            "font-size": "15px",
          },
        },
      },
      paintable: ["--color-brand", "--color-accent"],
      brandPack: {
        lockedTokens: ["--color-brand"],
      },
    } as Parameters<typeof registerTheme>[0]);

    const markdown = `---
theme: semi-locked
paint:
  "--color-brand": "#ff0000"
  "--color-accent": "#00ff00"
---
# Hello

World`;

    const result = await renderMarkdown(markdown);

    // --color-brand 被锁 → 原值 003366 保留
    expect(result.html).toContain("003366");
    // --color-accent 未锁 → 覆盖生效 → 00ff00 应出现
    expect(result.html).toContain("00ff00");
    // ff0000 不应出现（brand lock 阻止）
    expect(result.html).not.toContain("ff0000");

    // 仅一条 brand-pack warning
    const brandWarnings = result.diagnostics.filter((d) => d.ruleId === "brand-pack-locked-token");
    expect(brandWarnings).toHaveLength(1);
    expect(brandWarnings[0]?.severity).toBe("warning");
  });
});
