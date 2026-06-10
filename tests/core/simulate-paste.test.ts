import { describe, expect, it } from "vitest";
import { simulatePaste } from "../../packages/core/src/simulate-paste.ts";

describe("AC-001: id 属性剥除 + style 中 position 声明移除", () => {
  it("filteredHtml 中目标元素无 id 属性", () => {
    const html = '<div id="x" style="position:fixed;color:red">text</div>';
    const result = simulatePaste(html);
    expect(result.filteredHtml).not.toMatch(/\bid="x"/);
  });

  it("filteredHtml 中 style 内 position 声明被移除", () => {
    const html = '<div id="x" style="position:fixed;color:red">text</div>';
    const result = simulatePaste(html);
    expect(result.filteredHtml).not.toMatch(/position\s*:/i);
    expect(result.filteredHtml).toMatch(/color\s*:\s*red/);
  });

  it("nodeDiffs 含对应节点的 before/after 记录", () => {
    const html = '<div id="x" style="position:fixed;color:red">text</div>';
    const result = simulatePaste(html);
    expect(result.nodeDiffs.length).toBeGreaterThan(0);
    const diff = result.nodeDiffs[0];
    expect(diff.before).toMatch(/id="x"/);
    expect(diff.after).not.toMatch(/id="x"/);
  });
});

describe("AC-002: nodeDiffs 长度上界 + 条目结构", () => {
  it("nodeDiffs 长度 ≤ 输入元素数（5个元素）", () => {
    const html = "<p>a</p><p>b</p><p>c</p><p>d</p><p>e</p>";
    const result = simulatePaste(html);
    expect(result.nodeDiffs.length).toBeLessThanOrEqual(5);
  });

  it("每个 nodeDiff 条目含 nodeSelector / before / after 字段", () => {
    const html = '<div id="y" style="position:absolute">hello</div>';
    const result = simulatePaste(html);
    for (const diff of result.nodeDiffs) {
      expect(typeof diff.nodeSelector).toBe("string");
      expect(typeof diff.before).toBe("string");
      expect(typeof diff.after).toBe("string");
      expect(diff.nodeSelector.length).toBeGreaterThan(0);
    }
  });
});

describe("AC-003: <style> 标签完全剥除 + 剥除记录", () => {
  it("filteredHtml 中无 <style> 标签", () => {
    const html = "<style>body{color:red}</style><p>hello</p>";
    const result = simulatePaste(html);
    expect(result.filteredHtml).not.toMatch(/<style[\s>]/i);
  });

  it("nodeDiffs 或 droppedAttrs 中有 <style> 剥除记录", () => {
    const html = "<style>body{color:red}</style><p>hello</p>";
    const result = simulatePaste(html);
    const styleDropped =
      result.nodeDiffs.some((d) => d.before.includes("<style")) ||
      result.droppedAttrs.some((a) => a.nodeSelector.includes("style") || a.attrName === "__tag__");
    expect(styleDropped).toBe(true);
  });
});
