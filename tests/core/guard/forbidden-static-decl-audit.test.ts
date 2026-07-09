import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_DISPLAY_VALUES,
  FORBIDDEN_POSITION_PROPS,
} from "../../../packages/contracts/src/platform/wechat-paste.ts";
import { listBlocks, listMarks } from "../../../packages/core/src/index.ts";
import "../../../packages/blocks/src/index.ts";
import "../../../packages/marks/src/index.ts";
import businessTheme from "../../../packages/themes/business/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";
import literaryTheme from "../../../packages/themes/literary/src/index.ts";
import magazineTheme from "../../../packages/themes/magazine/src/index.ts";
import techTheme from "../../../packages/themes/tech/src/index.ts";

interface Violation {
  source: string;
  property: string;
  value: string;
}

function scanDeclarations(
  source: string,
  declarations: Record<string, string>,
  violations: Violation[]
): void {
  for (const [prop, value] of Object.entries(declarations)) {
    if (prop === "display" && FORBIDDEN_DISPLAY_VALUES.has(value.trim())) {
      violations.push({ source, property: prop, value });
    }
    if (prop === "position" || prop === "float") {
      violations.push({ source, property: prop, value });
    }
    if (FORBIDDEN_POSITION_PROPS.has(prop)) {
      violations.push({ source, property: prop, value });
    }
  }
}

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

function collectBlockViolations(): Violation[] {
  const violations: Violation[] = [];
  for (const block of listBlocks()) {
    if (block.baseStyle) {
      for (const [slot, declarations] of Object.entries(block.baseStyle)) {
        scanDeclarations(`block:${block.id}:root-baseStyle:${slot}`, declarations, violations);
      }
    }
    for (const variant of block.variants) {
      if (!variant.baseStyle) continue;
      for (const [slot, declarations] of Object.entries(variant.baseStyle)) {
        scanDeclarations(
          `block:${block.id}:variant:${variant.id}:${slot}`,
          declarations,
          violations
        );
      }
    }
  }
  return violations;
}

function collectMarkViolations(): Violation[] {
  const violations: Violation[] = [];
  for (const mark of listMarks()) {
    scanDeclarations(`mark:${mark.id}`, parseMarkStyleString(mark.style), violations);
  }
  return violations;
}

function collectThemeViolations(): Violation[] {
  const violations: Violation[] = [];
  const themes = [defaultTheme, literaryTheme, techTheme, businessTheme, magazineTheme];
  for (const theme of themes) {
    for (const [tag, variants] of Object.entries(theme.blocks ?? {})) {
      for (const [variantKey, declarations] of Object.entries(variants)) {
        scanDeclarations(`theme:${theme.id}:${tag}:${variantKey}`, declarations, violations);
      }
    }
  }
  return violations;
}

describe("AC-004: 全内置资产（block/variant/mark/theme）静态样式声明零 FORBIDDEN 命中", () => {
  it("全部内置 Block baseStyle/variant.baseStyle 声明中无 display:flex|grid|inline-flex|inline-grid / position / float / 定位族属性", () => {
    const violations = collectBlockViolations();
    expect(violations).toEqual([]);
  });

  it("全部内置 Mark style 声明中无 display:flex|grid|inline-flex|inline-grid / position / float / 定位族属性", () => {
    const violations = collectMarkViolations();
    expect(violations).toEqual([]);
  });

  it("全部内置主题 blocks 声明表中无 display:flex|grid|inline-flex|inline-grid / position / float / 定位族属性", () => {
    const violations = collectThemeViolations();
    expect(violations).toEqual([]);
  });

  it("审计覆盖至少 30 个内置 Block（回归防守：避免审计范围因导入缺失坍缩为 0）", () => {
    expect(listBlocks().length).toBeGreaterThanOrEqual(30);
  });

  it("审计覆盖至少 10 个内置 Mark（回归防守：避免审计范围因导入缺失坍缩为 0）", () => {
    expect(listMarks().length).toBeGreaterThanOrEqual(10);
  });
});
