import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Diagnostic } from "@wechat-flow/contracts";
import type { Element, Root as HastRoot } from "hast";
import { beforeEach, describe, expect, it } from "vitest";
import {
  parseMarkdown,
  renderMarkdown,
  resetBlockRegistry,
  resetVariantRegistry,
  transformToHast,
} from "../../../packages/core/src/index.ts";
import "../../../packages/blocks/src/index.ts";

// [ASSUMPTION] arch-wechat-flow-modules#§2.M-002 未显式命名"指令变体不合法"诊断的 ruleId，
// 沿用 interface_contract 指定的 fallback 命名 "directive-variant-invalid"。

beforeEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
});

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const REGRESSION_FIXTURE = readFileSync(join(FIXTURES_DIR, "t157-directive-regression.md"), "utf8");

function diagnosticsOf(result: { diagnostics: unknown[] }): Diagnostic[] {
  return result.diagnostics as Diagnostic[];
}

function findElementByDataBlock(node: HastRoot | Element, blockId: string): Element | undefined {
  const children = node.children as Array<HastRoot["children"][number]>;
  for (const child of children) {
    if (child.type === "element") {
      const el = child as Element;
      if (el.properties?.["data-block"] === blockId) {
        return el;
      }
      const found = findElementByDataBlock(el, blockId);
      if (found) return found;
    }
  }
  return undefined;
}

describe("AC-001: T-157 回归 fixture 合法指令全部通过校验", () => {
  it("fixture 指令计数 ≥29（护栏 fixture 完整性）", () => {
    const directiveCount = (REGRESSION_FIXTURE.match(/^:::[a-z-]+\{/gm) ?? []).length;
    expect(directiveCount).toBeGreaterThanOrEqual(29);
  });

  it("renderMarkdown(T-157 回归 fixture) → diagnostics 中 directive-attrs-invalid 计数为 0", async () => {
    const result = await renderMarkdown(REGRESSION_FIXTURE, { themeId: "default" });
    const invalidAttrDiagnostics = diagnosticsOf(result).filter(
      (d) => d.ruleId === "directive-attrs-invalid"
    );
    expect(invalidAttrDiagnostics.length).toBe(0);
  });
});

describe("AC-002a: 未声明属性 / 无属性块携带属性 → warning 诊断含属性名与允许属性清单", () => {
  it("无声明属性的 callout 携带未知属性 foo → warning 诊断 message 含属性名 foo 且说明该块不接受属性", async () => {
    const result = await renderMarkdown(':::callout{.tip foo="bar"}\n内容\n:::', {
      themeId: "default",
    });
    const diag = diagnosticsOf(result).find((d) => d.ruleId === "directive-attrs-invalid");
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe("warning");
    expect(diag?.message).toContain("foo");
    expect(diag?.message).toContain("不接受属性");
  });

  it("含声明属性的 pull-quote 携带未声明属性 foo → warning 诊断 message 含违规属性名 foo 与允许属性清单 author", async () => {
    const result = await renderMarkdown(
      ':::pull-quote{.decorated author="鲁迅" foo="bar"}\n摘引文字\n:::',
      { themeId: "default" }
    );
    const diag = diagnosticsOf(result).find((d) => d.ruleId === "directive-attrs-invalid");
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe("warning");
    expect(diag?.message).toContain("foo");
    expect(diag?.message).toContain("author");
  });
});

describe("AC-002b: 指令 class 首词不在该块 variants[] → warning 诊断含合法变体清单", () => {
  it("quote 指令 class 首词 no-such-variant 不在 variants[] → warning 诊断 message 含非法变体名与合法变体 default", async () => {
    const result = await renderMarkdown(":::quote{.no-such-variant}\n引用内容\n:::", {
      themeId: "default",
    });
    const diag = diagnosticsOf(result).find((d) => d.ruleId === "directive-variant-invalid");
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe("warning");
    expect(diag?.message).toContain("no-such-variant");
    expect(diag?.message).toContain("default");
  });

  it("callout 指令 class 首词 nope 不在 variants[] → warning 诊断 message 含非法变体名与合法变体清单 tip/warning/info/danger 之一", async () => {
    const result = await renderMarkdown(":::callout{.nope}\n内容\n:::", {
      themeId: "default",
    });
    const diag = diagnosticsOf(result).find((d) => d.ruleId === "directive-variant-invalid");
    expect(diag).toBeDefined();
    expect(diag?.message).toContain("nope");
    const mentionsLegalVariant = ["tip", "warning", "info", "danger"].some((id) =>
      diag?.message.includes(id)
    );
    expect(mentionsLegalVariant).toBe(true);
  });

  it("合法变体 quote{.default} 不产生 directive-variant-invalid 诊断", async () => {
    const result = await renderMarkdown(":::quote{.default}\n引用内容\n:::", {
      themeId: "default",
    });
    const diag = diagnosticsOf(result).find((d) => d.ruleId === "directive-variant-invalid");
    expect(diag).toBeUndefined();
  });
});

describe("AC-003: warning 诊断携带指令源位置（行号）", () => {
  it("attrs-invalid 诊断携带指令在源文中的实际行号（第 3 行）", async () => {
    const source = [
      "开篇段落用于制造行号偏移。",
      "",
      ':::pull-quote{.decorated author="鲁迅" foo="bar"}',
      "摘引内容",
      ":::",
    ].join("\n");
    const result = await renderMarkdown(source, { themeId: "default" });
    const diag = diagnosticsOf(result).find((d) => d.ruleId === "directive-attrs-invalid");
    expect(diag).toBeDefined();
    const hasLineInfo = diag?.location?.line === 3 || /第\s*3\s*行/.test(diag?.message ?? "");
    expect(hasLineInfo).toBe(true);
  });

  it("variant-invalid 诊断携带指令在源文中的实际行号（第 5 行）", async () => {
    const source = [
      "前置段落一。",
      "",
      "前置段落二。",
      "",
      ":::quote{.no-such-variant}",
      "引用内容",
      ":::",
    ].join("\n");
    const result = await renderMarkdown(source, { themeId: "default" });
    const diag = diagnosticsOf(result).find((d) => d.ruleId === "directive-variant-invalid");
    expect(diag).toBeDefined();
    const hasLineInfo = diag?.location?.line === 5 || /第\s*5\s*行/.test(diag?.message ?? "");
    expect(hasLineInfo).toBe(true);
  });
});

describe("AC-004: 声明属性按 data-{block}-{attr} 统一透传，独立于装饰变体特化分支", () => {
  it("pull-quote 非 decorated 变体（large）携带 author → hast 根元素带 data-pull-quote-author=鲁迅", () => {
    const mdast = parseMarkdown(':::pull-quote{.large author="鲁迅"}\n摘引文字\n:::');
    const hast = transformToHast(mdast, []);
    const el = findElementByDataBlock(hast, "pull-quote");
    expect(el).toBeDefined();
    expect(el?.properties?.["data-pull-quote-author"]).toBe("鲁迅");
  });

  it("dialog 非结构化变体（default）携带 speaker/avatar → hast 根元素带对应 data-dialog-speaker / data-dialog-avatar", () => {
    const mdast = parseMarkdown(
      ':::dialog{.default speaker="甲" avatar="https://example.test/a.png"}\n你好\n:::'
    );
    const hast = transformToHast(mdast, []);
    const el = findElementByDataBlock(hast, "dialog");
    expect(el).toBeDefined();
    expect(el?.properties?.["data-dialog-speaker"]).toBe("甲");
    expect(el?.properties?.["data-dialog-avatar"]).toBe("https://example.test/a.png");
  });

  it("compare 非结构化变体（default）携带五个声明属性 → hast 根元素带对应 data-compare-* 全部五项", () => {
    const mdast = parseMarkdown(
      ':::compare{.default left-label="优点" left-value="速度快" right-label="缺点" right-value="成本高" title="方案对比"}\n:::'
    );
    const hast = transformToHast(mdast, []);
    const el = findElementByDataBlock(hast, "compare");
    expect(el).toBeDefined();
    expect(el?.properties?.["data-compare-left-label"]).toBe("优点");
    expect(el?.properties?.["data-compare-left-value"]).toBe("速度快");
    expect(el?.properties?.["data-compare-right-label"]).toBe("缺点");
    expect(el?.properties?.["data-compare-right-value"]).toBe("成本高");
    expect(el?.properties?.["data-compare-title"]).toBe("方案对比");
  });
});
