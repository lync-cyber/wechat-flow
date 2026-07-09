import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Element, Properties } from "hast";
import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_CSS_PROPS,
  FORBIDDEN_DISPLAY_VALUES,
  FORBIDDEN_POSITION_PROPS,
  FORBIDDEN_VALUE_PATTERNS,
  FORBIDDEN_VALUE_PATTERN_EXCEPTIONS,
  HARD_REMOVE_TAGS,
  IFRAME_SRC_ALLOW,
  NEAR_WHITE,
  isForbiddenCssValue,
} from "../../packages/contracts/src/index.ts";
import * as platformExports from "../../packages/contracts/src/platform/wechat-paste.ts";
import { builtinRules } from "../../packages/ruleset/src/index.ts";

function makeElement(tagName: string, properties: Properties): Element {
  return { type: "element", tagName, properties, children: [] };
}

function findRule(id: string): RuleDefinitionLike {
  const rule = builtinRules.find((r) => r.id === id);
  if (!rule) throw new Error(`builtin rule not found: ${id}`);
  return rule;
}

type RuleDefinitionLike = (typeof builtinRules)[number];

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const packagesRoot = join(repoRoot, "packages");
const canonicalConstantsFile = join(
  packagesRoot,
  "contracts",
  "src",
  "platform",
  "wechat-paste.ts"
);

function walkSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(full, acc);
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      acc.push(full);
    }
  }
  return acc;
}

function filesLiterallyContainingAllMembers(members: Iterable<string>): string[] {
  const needles = Array.from(members);
  return walkSourceFiles(packagesRoot).filter((file) => {
    const content = readFileSync(file, "utf-8");
    return needles.every((m) => content.includes(`"${m}"`));
  });
}

describe("AC-001: FORBIDDEN_CSS_PROPS 平台常量", () => {
  it("恰好含 font-family/position/float 三个成员", () => {
    expect(Array.from(FORBIDDEN_CSS_PROPS).sort()).toEqual(["float", "font-family", "position"]);
  });

  it("可用 has() 查询到 font-family（customCss 声明 font-family 须被拦截的判据来源）", () => {
    expect(FORBIDDEN_CSS_PROPS.has("font-family")).toBe(true);
  });
});

describe("AC-001: FORBIDDEN_DISPLAY_VALUES 平台常量", () => {
  it("恰好含 flex/inline-flex/grid/inline-grid 四个成员", () => {
    expect(Array.from(FORBIDDEN_DISPLAY_VALUES).sort()).toEqual([
      "flex",
      "grid",
      "inline-flex",
      "inline-grid",
    ]);
  });
});

describe("AC-001: FORBIDDEN_POSITION_PROPS 平台常量", () => {
  it("恰好含定位族 top/right/bottom/left/z-index 五个成员（不含 position 本身）", () => {
    expect(Array.from(FORBIDDEN_POSITION_PROPS).sort()).toEqual([
      "bottom",
      "left",
      "right",
      "top",
      "z-index",
    ]);
    expect(FORBIDDEN_POSITION_PROPS.has("position")).toBe(false);
  });
});

describe("AC-001: HARD_REMOVE_TAGS 平台常量", () => {
  it("含 script 标签（微信硬删的明显危险标签）", () => {
    expect(HARD_REMOVE_TAGS.has("script")).toBe(true);
  });

  it("含 style 标签", () => {
    expect(HARD_REMOVE_TAGS.has("style")).toBe(true);
  });

  it("不含普通安全标签如 span（非过度指定，仅确认集合有实际筛选边界）", () => {
    expect(HARD_REMOVE_TAGS.has("span")).toBe(false);
  });
});

describe("AC-001: FORBIDDEN_VALUE_PATTERNS 平台常量", () => {
  it("恰好含 -webkit-/@media/@keyframes/:hover/:active 五个模式", () => {
    expect(Array.from(FORBIDDEN_VALUE_PATTERNS).sort()).toEqual(
      ["-webkit-", "@keyframes", "@media", ":active", ":hover"].sort()
    );
  });
});

describe("AC-001: IFRAME_SRC_ALLOW 平台常量", () => {
  it("含 v.qq.com（微信视频白名单域名）", () => {
    expect(IFRAME_SRC_ALLOW.has("v.qq.com")).toBe(true);
  });

  it("不含任意未声明域名（非空泛占位，集合具备实际筛选边界）", () => {
    expect(IFRAME_SRC_ALLOW.has("evil.example.com")).toBe(false);
  });
});

describe("AC-001: NEAR_WHITE 平台常量", () => {
  it("值为 #fefefe（微信 SVG 纯白偏移目标色，与既有 transform-svg-white-offset 输出一致）", () => {
    expect(NEAR_WHITE).toBe("#fefefe");
  });
});
describe("AC-002: FORBIDDEN_VALUE_PATTERNS 例外白名单不误杀已上线功能", () => {
  it("例外白名单恰好含 -webkit-text-emphasis/print-color-adjust/overflow-scrolling/-webkit-overflow-scrolling 四个成员", () => {
    expect(Array.from(FORBIDDEN_VALUE_PATTERN_EXCEPTIONS).sort()).toEqual(
      [
        "-webkit-overflow-scrolling",
        "-webkit-text-emphasis",
        "overflow-scrolling",
        "print-color-adjust",
      ].sort()
    );
  });

  it("emphasis.ts 已上线的 -webkit-text-emphasis 声明不被判定为 FORBIDDEN（对应锚点 packages/marks/src/marks/emphasis.ts:6 的真实声明）", () => {
    expect(
      isForbiddenCssValue(
        "text-emphasis: filled circle; text-emphasis-position: under left; -webkit-text-emphasis: filled circle"
      )
    ).toBe(false);
  });

  it("含 print-color-adjust 例外前缀的 -webkit-print-color-adjust 声明不被判定为 FORBIDDEN", () => {
    expect(isForbiddenCssValue("-webkit-print-color-adjust: exact")).toBe(false);
  });

  it("含 overflow-scrolling 例外前缀的 -webkit-overflow-scrolling 声明不被判定为 FORBIDDEN", () => {
    expect(isForbiddenCssValue("-webkit-overflow-scrolling: touch")).toBe(false);
  });

  it("不在例外白名单内的 -webkit- 声明被判定为 FORBIDDEN（例外表非无差别放行整个 -webkit- 前缀）", () => {
    expect(isForbiddenCssValue("-webkit-transform: rotate(45deg)")).toBe(true);
  });

  it("@media 注入被判定为 FORBIDDEN", () => {
    expect(isForbiddenCssValue("@media (max-width: 600px) { color: red }")).toBe(true);
  });

  it("@keyframes 注入被判定为 FORBIDDEN", () => {
    expect(isForbiddenCssValue("@keyframes spin { from { transform: rotate(0); } }")).toBe(true);
  });

  it(":hover 伪类注入被判定为 FORBIDDEN", () => {
    expect(isForbiddenCssValue("a:hover { color: blue }")).toBe(true);
  });

  it(":active 伪类注入被判定为 FORBIDDEN", () => {
    expect(isForbiddenCssValue("button:active { outline: none }")).toBe(true);
  });

  it("不含任何禁止模式的普通声明不被判定为 FORBIDDEN", () => {
    expect(isForbiddenCssValue("color: #333333; font-size: 16px")).toBe(false);
  });
});
describe("AC-004①: 构造禁集单一源派生", () => {
  it("barrel 导出的 FORBIDDEN_CSS_PROPS/FORBIDDEN_DISPLAY_VALUES/FORBIDDEN_POSITION_PROPS 与 platform 模块导出为同一对象引用（barrel 只转发，非拷贝副本）", () => {
    expect(FORBIDDEN_CSS_PROPS).toBe(platformExports.FORBIDDEN_CSS_PROPS);
    expect(FORBIDDEN_DISPLAY_VALUES).toBe(platformExports.FORBIDDEN_DISPLAY_VALUES);
    expect(FORBIDDEN_POSITION_PROPS).toBe(platformExports.FORBIDDEN_POSITION_PROPS);
    expect(FORBIDDEN_CSS_PROPS).toBeInstanceOf(Set);
    expect(FORBIDDEN_CSS_PROPS.has("font-family")).toBe(true);
  });

  it("仓内仅 wechat-paste.ts 一处字面量同时包含 FORBIDDEN_CSS_PROPS 全部成员（font-family/position/float），无第二份独立维护的同语义禁集清单", () => {
    const hits = filesLiterallyContainingAllMembers(FORBIDDEN_CSS_PROPS);
    expect(hits).toEqual([canonicalConstantsFile]);
  });

  it("仓内仅 wechat-paste.ts 一处字面量同时包含 FORBIDDEN_DISPLAY_VALUES 全部成员（flex/inline-flex/grid/inline-grid）", () => {
    const hits = filesLiterallyContainingAllMembers(FORBIDDEN_DISPLAY_VALUES);
    expect(hits).toEqual([canonicalConstantsFile]);
  });

  it("仓内仅 wechat-paste.ts 一处字面量同时包含 FORBIDDEN_POSITION_PROPS 全部成员（top/right/bottom/left/z-index）", () => {
    const hits = filesLiterallyContainingAllMembers(FORBIDDEN_POSITION_PROPS);
    expect(hits).toEqual([canonicalConstantsFile]);
  });
});
describe("AC-004②: output 补救规则靶值单向 ⊆ 常量集", () => {
  it("strip-position 实际剥离的属性 'position' 是 FORBIDDEN_CSS_PROPS 的成员", () => {
    expect(FORBIDDEN_CSS_PROPS.has("position")).toBe(true);
    const rule = findRule("strip-position");
    const el = makeElement("span", { style: "position: absolute; color: red" });
    expect(rule.matcher(el)).toBe(true);
    const result = rule.transform(el) as Element;
    const resultStyle = result.properties?.style as string;
    expect(resultStyle).not.toContain("position");
    expect(resultStyle).toContain("color");
  });

  it("strip-font-family 实际剥离的属性 'font-family' 是 FORBIDDEN_CSS_PROPS 的成员", () => {
    expect(FORBIDDEN_CSS_PROPS.has("font-family")).toBe(true);
    const rule = findRule("strip-font-family");
    const el = makeElement("span", { style: "font-family: SimSun; color: blue" });
    expect(rule.matcher(el)).toBe(true);
    const result = rule.transform(el) as Element;
    const resultStyle = result.properties?.style as string;
    expect(resultStyle).not.toContain("font-family");
    expect(resultStyle).toContain("color");
  });

  it("patch-flex-to-block 实际改写的 display:flex 是 FORBIDDEN_DISPLAY_VALUES 的成员", () => {
    expect(FORBIDDEN_DISPLAY_VALUES.has("flex")).toBe(true);
    const rule = findRule("patch-flex-to-block");
    const el = makeElement("div", { style: "display: flex" });
    expect(rule.matcher(el)).toBe(true);
    const result = rule.transform(el) as Element;
    expect(result.properties?.style).toBe("display: block");
  });

  it("patch-flex-to-block 实际改写的 display:inline-flex 是 FORBIDDEN_DISPLAY_VALUES 的成员", () => {
    expect(FORBIDDEN_DISPLAY_VALUES.has("inline-flex")).toBe(true);
    const rule = findRule("patch-flex-to-block");
    const el = makeElement("div", { style: "display: inline-flex" });
    expect(rule.matcher(el)).toBe(true);
    const result = rule.transform(el) as Element;
    expect(result.properties?.style).toBe("display: inline-block");
  });
});
describe("AC-004③: 无运行期规则子集显式排除（float/定位族/grid 未纳入本卡 output 同步范围，由 T-187 兜底）", () => {
  const outputStripOrPatchRules = builtinRules.filter(
    (r) => r.stage === "output" && (r.scope === "strip" || r.scope === "patch")
  );
  const excludedCssPropCases = ["float", "top", "right", "bottom", "left", "z-index"];

  it.each(excludedCssPropCases)(
    "CSS 属性 '%s' 无任何 output 域 strip/patch 规则匹配（有意排除出本卡 output 同步范围，非遗漏，由 T-187 构造守卫兜底）",
    (prop) => {
      if (prop !== "float") {
        expect(FORBIDDEN_POSITION_PROPS.has(prop)).toBe(true);
      }
      const el = makeElement("span", { style: `${prop}: 10px; color: green` });
      const matchedRuleIds = outputStripOrPatchRules
        .filter((rule) => rule.matcher(el))
        .map((rule) => rule.id);
      expect(matchedRuleIds).toEqual([]);
    }
  );

  it.each(["grid", "inline-grid"])(
    "display:%s 无任何 output 域 strip/patch 规则匹配（有意排除出本卡 output 同步范围，非遗漏，由 T-187 构造守卫兜底）",
    (displayValue) => {
      const el = makeElement("div", { style: `display: ${displayValue}` });
      const matchedRuleIds = outputStripOrPatchRules
        .filter((rule) => rule.matcher(el))
        .map((rule) => rule.id);
      expect(matchedRuleIds).toEqual([]);
    }
  );
});
