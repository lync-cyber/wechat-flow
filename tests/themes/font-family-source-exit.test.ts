import { describe, expect, it } from "vitest";
import { paragraph } from "../../packages/blocks/src/blocks/paragraph.ts";
import { quote } from "../../packages/blocks/src/blocks/quote.ts";
import { inlineCode } from "../../packages/marks/src/marks/inline-code.ts";
import { codeBlocks as businessCodeBlocks } from "../../packages/themes/business/src/blocks/code-block.ts";
import { headingBlocks as businessHeadingBlocks } from "../../packages/themes/business/src/blocks/heading.ts";
import { paragraphBlocks as businessParagraphBlocks } from "../../packages/themes/business/src/blocks/paragraph.ts";
import { codeBlocks as defaultCodeBlocks } from "../../packages/themes/default/src/blocks/code-block.ts";
import { headingBlocks as defaultHeadingBlocks } from "../../packages/themes/default/src/blocks/heading.ts";
import { paragraphBlocks as defaultParagraphBlocks } from "../../packages/themes/default/src/blocks/paragraph.ts";
import { codeBlocks as literaryCodeBlocks } from "../../packages/themes/literary/src/blocks/code-block.ts";
import { headingBlocks as literaryHeadingBlocks } from "../../packages/themes/literary/src/blocks/heading.ts";
import { paragraphBlocks as literaryParagraphBlocks } from "../../packages/themes/literary/src/blocks/paragraph.ts";
import { codeBlocks as magazineCodeBlocks } from "../../packages/themes/magazine/src/blocks/code-block.ts";
import { headingBlocks as magazineHeadingBlocks } from "../../packages/themes/magazine/src/blocks/heading.ts";
import { paragraphBlocks as magazineParagraphBlocks } from "../../packages/themes/magazine/src/blocks/paragraph.ts";
import { codeBlocks as techCodeBlocks } from "../../packages/themes/tech/src/blocks/code-block.ts";
import { headingBlocks as techHeadingBlocks } from "../../packages/themes/tech/src/blocks/heading.ts";
import { paragraphBlocks as techParagraphBlocks } from "../../packages/themes/tech/src/blocks/paragraph.ts";

interface ThemeDeclarationFixture {
  name: string;
  h1Color: string;
  h1FontSize: string;
  pColor: string;
  pFontSize: string;
  codeColor: string;
  codeFontSize: string;
  heading: typeof defaultHeadingBlocks;
  paragraph: typeof defaultParagraphBlocks;
  code: typeof defaultCodeBlocks;
}

const THEME_FIXTURES: ThemeDeclarationFixture[] = [
  {
    name: "default",
    h1Color: "#1c1917",
    h1FontSize: "22px",
    pColor: "#1c1917",
    pFontSize: "15px",
    codeColor: "#292524",
    codeFontSize: "13px",
    heading: defaultHeadingBlocks,
    paragraph: defaultParagraphBlocks,
    code: defaultCodeBlocks,
  },
  {
    name: "literary",
    h1Color: "#2c1f0a",
    h1FontSize: "21px",
    pColor: "#2c1f0a",
    pFontSize: "15px",
    codeColor: "#2c1f0a",
    codeFontSize: "13px",
    heading: literaryHeadingBlocks,
    paragraph: literaryParagraphBlocks,
    code: literaryCodeBlocks,
  },
  {
    name: "tech",
    h1Color: "#e6edf3",
    h1FontSize: "24px",
    pColor: "#e6edf3",
    pFontSize: "15px",
    codeColor: "#e6edf3",
    codeFontSize: "13px",
    heading: techHeadingBlocks,
    paragraph: techParagraphBlocks,
    code: techCodeBlocks,
  },
  {
    name: "business",
    h1Color: "#0d1b2a",
    h1FontSize: "22px",
    pColor: "#0d1b2a",
    pFontSize: "15px",
    codeColor: "#0d1b2a",
    codeFontSize: "13px",
    heading: businessHeadingBlocks,
    paragraph: businessParagraphBlocks,
    code: businessCodeBlocks,
  },
  {
    name: "magazine",
    h1Color: "#1a1208",
    h1FontSize: "26px",
    pColor: "#1a1208",
    pFontSize: "16px",
    codeColor: "#3a2010",
    codeFontSize: "14px",
    heading: magazineHeadingBlocks,
    paragraph: magazineParagraphBlocks,
    code: magazineCodeBlocks,
  },
];

describe("AC-001/002: 5 主题 heading/paragraph/code-block 声明面退出 font-family 声明", () => {
  for (const fixture of THEME_FIXTURES) {
    it(`${fixture.name} 主题 h1.default 不含 font-family 键，同时保留 color/font-size 计算值`, () => {
      const h1Style = fixture.heading.h1?.default ?? {};
      expect("font-family" in h1Style).toBe(false);
      expect(h1Style.color).toBe(fixture.h1Color);
      expect(h1Style["font-size"]).toBe(fixture.h1FontSize);
    });

    it(`${fixture.name} 主题 p.default 不含 font-family 键，同时保留 color/font-size 计算值`, () => {
      const pStyle = fixture.paragraph.p?.default ?? {};
      expect("font-family" in pStyle).toBe(false);
      expect(pStyle.color).toBe(fixture.pColor);
      expect(pStyle["font-size"]).toBe(fixture.pFontSize);
    });

    it(`${fixture.name} 主题 code.default 不含 font-family 键，同时保留 color/font-size 计算值`, () => {
      const codeStyle = fixture.code.code?.default ?? {};
      expect("font-family" in codeStyle).toBe(false);
      expect(codeStyle.color).toBe(fixture.codeColor);
      expect(codeStyle["font-size"]).toBe(fixture.codeFontSize);
    });

    it(`${fixture.name} 主题 pre.default 不含 font-family 键，同时保留 color/font-size 计算值`, () => {
      const preStyle = fixture.code.pre?.default ?? {};
      expect("font-family" in preStyle).toBe(false);
      expect(preStyle.color).toBe(fixture.codeColor);
      expect(preStyle["font-size"]).toBe(fixture.codeFontSize);
    });
  }
});

describe("AC-001/002: paragraph/quote dropcap 变体 baseStyle.dropcap 退出 font-family 声明", () => {
  it("paragraph 的 dropcap 变体 baseStyle.dropcap 不含 font-family 键，保留 font-size/color/display 计算值", () => {
    const variant = paragraph.variants.find((v) => v.id === "dropcap");
    const style = variant?.baseStyle?.dropcap ?? {};
    expect("font-family" in style).toBe(false);
    expect(style["font-size"]).toBe("2.2em");
    expect(style.color).toBe("var(--color-brand)");
    expect(style.display).toBe("table-cell");
  });

  it("quote 的 dropcap 变体 baseStyle.dropcap 不含 font-family 键，保留 font-size/color/display 计算值", () => {
    const variant = quote.variants.find((v) => v.id === "dropcap");
    const style = variant?.baseStyle?.dropcap ?? {};
    expect("font-family" in style).toBe(false);
    expect(style["font-size"]).toBe("2.2em");
    expect(style.color).toBe("var(--color-brand)");
    expect(style.display).toBe("table-cell");
  });
});

function parseMarkStyleString(style: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const decl of style.split(";")) {
    const trimmed = decl.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    result[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return result;
}

describe("AC-001/002: inline-code mark 的 style 串退出 font-family 声明", () => {
  it("inlineCode.style 解析后不含 font-family 键，保留 background/padding/border-radius/font-size 计算值", () => {
    const decls = parseMarkStyleString(inlineCode.style);
    expect("font-family" in decls).toBe(false);
    expect(decls.background).toBe("#F0EDE8");
    expect(decls.padding).toBe("2px 4px");
    expect(decls["border-radius"]).toBe("3px");
    expect(decls["font-size"]).toBe("13px");
  });
});
