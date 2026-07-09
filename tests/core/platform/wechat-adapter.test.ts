import type { Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { toHtml } from "hast-util-to-html";
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../../packages/core/src/index.ts";
import { applyRuleset, builtinRules } from "../../../packages/ruleset/src/index.ts";

// packages/core/src/platform/wechat-adapter.ts does not exist yet (T-185 GREEN target).
// Dynamic import defers module-not-found failure to each test's runtime, matching the
// established RED pattern in tests/core/render.test.ts.
async function loadWechatAdapter() {
  const mod = await import("../../../packages/core/src/platform/wechat-adapter.ts");
  return mod.wechatAdapter as {
    id: string;
    name: string;
    patch: (
      hast: Root,
      rules?: unknown
    ) => { hast: Root; diagnostics: unknown[]; nodeChangeRecords: { triggerRuleId: string }[] };
    inspect: (html: string) => {
      patchedHtml: string;
      changes: { patch: string; label?: string; count: number; samples: { before: string }[] }[];
    };
  };
}

describe("AC-001: wechatAdapter.id 标识微信平台", () => {
  it("wechatAdapter.id 恰为 'wechat'", async () => {
    const wechatAdapter = await loadWechatAdapter();
    expect(wechatAdapter.id).toBe("wechat");
  });
});

describe("AC-001: wechatAdapter.patch 对 output 相规则的具名封装行为", () => {
  it("含 position 声明的 hast 经 patch 后该声明被剥离，返回 hast/diagnostics/nodeChangeRecords 三字段", async () => {
    const wechatAdapter = await loadWechatAdapter();
    const hast = fromHtml('<span style="position:absolute; color:red">hi</span>', {
      fragment: true,
    }) as unknown as Root;
    const result = wechatAdapter.patch(hast);

    const serialized = toHtml(result.hast);
    expect(serialized).not.toMatch(/position\s*:/i);
    expect(serialized).toMatch(/color:\s*red/);
    expect(Array.isArray(result.diagnostics)).toBe(true);
    expect(result.nodeChangeRecords.length).toBeGreaterThan(0);
    expect(result.nodeChangeRecords.some((r) => r.triggerRuleId === "strip-position")).toBe(true);
  });
});

describe("AC-002: patch 是 output 相 applyRuleset 的零行为改变具名封装", () => {
  it("wechatAdapter.patch(hast) 与直接 applyRuleset(hast, builtinRules, 'output') 产出字节级相同的序列化 HTML", async () => {
    const wechatAdapter = await loadWechatAdapter();
    const html =
      '<div style="position:absolute; color:red"><span style="font-family:SimSun">hi</span></div>';
    const hastForAdapter = fromHtml(html, { fragment: true }) as unknown as Root;
    const hastForDirect = fromHtml(html, { fragment: true }) as unknown as Root;

    const viaAdapter = wechatAdapter.patch(hastForAdapter);
    const viaDirect = applyRuleset(hastForDirect, builtinRules, "output");

    expect(toHtml(viaAdapter.hast)).toBe(toHtml(viaDirect.hast));
    expect(viaAdapter.nodeChangeRecords.map((r) => r.triggerRuleId).sort()).toEqual(
      viaDirect.nodeChangeRecords.map((r) => r.triggerRuleId).sort()
    );
  });
});

describe("AC-003: inspect ⊆ patch 平台过滤子集（正向/负向探针）", () => {
  it("同时报告 div 标签剥离与 position 声明剥离（div 属 schema 层不安全标签、position 属 strip-position 平台过滤规则）", async () => {
    const wechatAdapter = await loadWechatAdapter();
    const html = '<div style="position:absolute">x</div>';
    const result = wechatAdapter.inspect(html);

    expect(result.changes.length).toBeGreaterThanOrEqual(2);
    expect(result.patchedHtml).not.toMatch(/<div[\s>]/i);
    expect(result.patchedHtml).not.toMatch(/position\s*:/i);

    const divChange = result.changes.find((c) => c.samples.some((s) => s.before.includes("<div")));
    expect(divChange).toBeDefined();

    const positionChange = result.changes.find((c) => c.patch === "strip-position");
    expect(positionChange).toBeDefined();
  });

  it("font-size:12px 段落不触发字号夹取归一（clamp-font-size 属产品归一非平台过滤，changes 应为空）", async () => {
    const wechatAdapter = await loadWechatAdapter();
    const html = '<p style="font-size:12px">x</p>';
    const result = wechatAdapter.inspect(html);

    expect(result.changes).toEqual([]);
  });

  it("同时命中平台过滤（strip-position）与产品归一（transform-em-to-px/clamp-font-size）时 changes 只含平台过滤项", async () => {
    const wechatAdapter = await loadWechatAdapter();
    const html = '<p style="position:absolute; font-size:12px; margin:1em">x</p>';
    const result = wechatAdapter.inspect(html);

    expect(result.patchedHtml).not.toMatch(/position\s*:/i);
    expect(result.patchedHtml).toMatch(/font-size:\s*12px/);
    expect(result.patchedHtml).not.toContain("14px");
    expect(result.patchedHtml).toMatch(/margin:\s*1em/);
    expect(result.patchedHtml).not.toContain("16px");

    expect(
      result.changes.every((c) => c.patch !== "clamp-font-size" && c.patch !== "transform-em-to-px")
    ).toBe(true);
    expect(result.changes.some((c) => c.patch === "strip-position")).toBe(true);
  });
});

describe("AC-004: inspect(render(含裸 <div> 的 markdown)) 的稳定态为空 changes", () => {
  it("render 产物已 div-free（remark-rehype allowDangerousHtml:false 前提坐实），inspect 该产物 changes 为空数组", async () => {
    const wechatAdapter = await loadWechatAdapter();
    const md = '# Title\n\n<div class="x">raw</div>\n\nSome paragraph.';
    const result = await renderMarkdown(md);

    expect(result.html).not.toMatch(/<div[\s>]/i);

    const inspection = wechatAdapter.inspect(result.html);
    expect(inspection.changes).toEqual([]);
  });
});
