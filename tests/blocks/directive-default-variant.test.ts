import { beforeEach, describe, expect, it } from "vitest";
import {
  describeBlock,
  getBlockBaseStyle,
  listAllVariants,
  listBlocks,
  renderMarkdown,
  resetBlockRegistry,
  resetVariantRegistry,
} from "../../packages/core/src/index.ts";
import "../../packages/blocks/src/index.ts";

// callout 裸指令(:::callout)故意排除在全量扫描之外：ui-spec §10.1 明确将 callout
// 变体清单收敛为 tip/warning/info/danger 四态,不含 default,强制作者显式选择变体。
// 该设计已由 tests/core/blocks/callout-variants.test.ts 与
// tests/blocks/p1-incremental.test.ts 的 "variants 数量恰为 4" 断言锁定，本卡不改动 callout。
const EXCLUDED_FROM_DEFAULT_SCAN = new Set(["callout"]);

beforeEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
});

function variantInvalidDiagnostics(diagnostics: ReadonlyArray<{ ruleId?: string }>) {
  return diagnostics.filter((d) => d.ruleId === "directive-variant-invalid");
}

describe("AC-001: 四个目标块裸指令渲染零 directive-variant-invalid", () => {
  it.each(["announcement", "gallery", "list"] as const)(
    "裸 :::%s 渲染后 diagnostics 中无 directive-variant-invalid",
    async (blockId) => {
      const result = await renderMarkdown(`:::${blockId}\n内容\n:::`, { themeId: "default" });
      expect(variantInvalidDiagnostics(result.diagnostics)).toHaveLength(0);
    }
  );

  it("裸 :::callout 渲染后 diagnostics 仍含 directive-variant-invalid（ui-spec §10.1 设计排除）", async () => {
    const result = await renderMarkdown(":::callout\n内容\n:::", { themeId: "default" });
    expect(variantInvalidDiagnostics(result.diagnostics).length).toBeGreaterThan(0);
  });
});

describe("AC-001: 全 40 块裸指令扫描，除 callout 外无 directive-variant-invalid 假警告", () => {
  it("listBlocks() 长度 ≥ 40", () => {
    expect(listBlocks().length).toBeGreaterThanOrEqual(40);
  });

  it("全部非排除块的裸指令均无 directive-variant-invalid", async () => {
    const blocks = listBlocks().filter((b) => !EXCLUDED_FROM_DEFAULT_SCAN.has(b.id));
    const offenders: string[] = [];
    for (const block of blocks) {
      const result = await renderMarkdown(`:::${block.id}\n内容\n:::`, { themeId: "default" });
      if (variantInvalidDiagnostics(result.diagnostics).length > 0) {
        offenders.push(block.id);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("AC-002: 四块 default 渲染语义正确", () => {
  it("announcement 裸指令渲染 root 容器计算样式含左边框声明（走块级 baseStyle）", async () => {
    const result = await renderMarkdown(":::announcement\n公告内容\n:::", { themeId: "default" });
    const containerMatch = result.html.match(
      /<section data-block="announcement" data-variant="default" style="([^"]*)"/
    );
    expect(containerMatch).not.toBeNull();
    const styleAttr = containerMatch?.[1] ?? "";
    expect(styleAttr).toContain("border-left: 3px solid #b94a3e");
    expect(styleAttr).not.toContain("border-top");
  });

  it("callout 裸指令（无法解析出合法变体）根节点仍以 data-variant=default 渲染但不含块级 baseStyle 声明", async () => {
    const result = await renderMarkdown(":::callout\n内容\n:::", { themeId: "default" });
    const containerMatch = result.html.match(
      /<section data-block="callout" data-variant="default" style="([^"]*)"/
    );
    expect(containerMatch).not.toBeNull();
  });

  it("list 裸指令渲染成功且无假警告（无块级 baseStyle，仅验证正常渲染）", async () => {
    const result = await renderMarkdown(":::list\n- 项目一\n- 项目二\n:::", {
      themeId: "default",
    });
    expect(variantInvalidDiagnostics(result.diagnostics)).toHaveLength(0);
    expect(result.html).toContain('data-block="list"');
    expect(result.html).toContain('data-variant="default"');
  });

  it("gallery 裸指令渲染结构 = duo 双列 table 布局（display:table 的 row/cell 结构）", async () => {
    const md = [
      ":::gallery",
      '- ![图一](https://example.com/a.png "说明一")',
      "- ![图二](https://example.com/b.png)",
      ":::",
    ].join("\n");
    const result = await renderMarkdown(md, { themeId: "default" });
    expect(variantInvalidDiagnostics(result.diagnostics)).toHaveLength(0);

    const rowMatches = [
      ...result.html.matchAll(/<section style="([^"]*display: table-row[^"]*)">/g),
    ];
    expect(rowMatches).toHaveLength(1);

    const cellMatches = [
      ...result.html.matchAll(/<section style="([^"]*display: table-cell[^"]*)">/g),
    ];
    expect(cellMatches).toHaveLength(2);
    for (const [, style] of cellMatches) {
      expect(style).toContain("width: 50%");
    }
  });
});

describe("AC-003: 变体清单消费面随注册表自动含 default", () => {
  it.each(["announcement", "gallery", "list"] as const)(
    "listAllVariants() 含 {blockId: '%s', id: 'default'}",
    (blockId) => {
      const all = listAllVariants();
      const found = all.find((v) => v.blockId === blockId && v.id === "default");
      expect(found).toBeDefined();
    }
  );

  it("listAllVariants() 不含 {blockId: 'callout', id: 'default'}（设计排除）", () => {
    const all = listAllVariants();
    const found = all.find((v) => v.blockId === "callout" && v.id === "default");
    expect(found).toBeUndefined();
  });

  it("describeBlock('announcement').variants 含 id==='default' 条目", () => {
    const def = describeBlock("announcement");
    const found = def?.variants.find((v) => v.id === "default");
    expect(found).toBeDefined();
    expect(typeof found?.label).toBe("string");
    expect(found?.label?.length).toBeGreaterThan(0);
  });

  it("describeBlock('gallery').variants 含 id==='default' 条目", () => {
    const def = describeBlock("gallery");
    const found = def?.variants.find((v) => v.id === "default");
    expect(found).toBeDefined();
  });

  it("describeBlock('list').variants 含 id==='default' 条目", () => {
    const def = describeBlock("list");
    const found = def?.variants.find((v) => v.id === "default");
    expect(found).toBeDefined();
  });

  it("getBlockBaseStyle('announcement','default') 与 danger-bar 简化版语义一致（无 border-top，含左边框与浅底）", () => {
    const base = getBlockBaseStyle("announcement", "default");
    expect(base["border-top"]).toBeUndefined();
    expect(base["border-left"]).toContain("3px solid");
    expect(base.background).toBeDefined();
  });
});
