import type { Element, Properties, Root, Text } from "hast";
import { describe, expect, it } from "vitest";
import { applyRuleset } from "../../packages/ruleset/src/index.ts";
import { readabilityRules } from "../../packages/ruleset/src/rules/readability/index.ts";

// ── helpers ───────────────────────────────────────────────────────────────────

function makeHast(children: Element[]): Root {
  return { type: "root", children };
}

function makeElement(
  tagName: string,
  properties: Properties,
  children: Array<Element | Text> = []
): Element {
  return { type: "element", tagName, properties, children };
}

function makeText(value: string): Text {
  return { type: "text", value };
}

// ── AC-001: rule set shape ────────────────────────────────────────────────────

describe("T-061 AC-001: readabilityRules exports 3 lint rules with correct scope and severities", () => {
  it("exports an array of exactly 3 rules", () => {
    expect(readabilityRules).toHaveLength(3);
  });

  it("all 3 rules have scope === 'lint'", () => {
    for (const rule of readabilityRules) {
      expect(rule.scope).toBe("lint");
    }
  });

  it("readability-font-size-min rule has severity 'warning' on match", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-font-size-min");
    if (!rule) throw new Error("readability-font-size-min not found");

    const el = makeElement("p", { style: "font-size:10px" });
    const hast = makeHast([el]);
    const result = applyRuleset(hast, [rule]);
    const diag = result.report.diagnostics.find((d) => d.ruleId === "readability-font-size-min");
    if (!diag) throw new Error("Expected diagnostic for readability-font-size-min");
    expect(diag.severity).toBe("warning");
  });

  it("readability-line-height-min rule has severity 'warning' on match", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-line-height-min");
    if (!rule) throw new Error("readability-line-height-min not found");

    const el = makeElement("p", { style: "line-height:1.2" });
    const hast = makeHast([el]);
    const result = applyRuleset(hast, [rule]);
    const diag = result.report.diagnostics.find((d) => d.ruleId === "readability-line-height-min");
    if (!diag) throw new Error("Expected diagnostic for readability-line-height-min");
    expect(diag.severity).toBe("warning");
  });

  it("readability-paragraph-length rule has severity 'info' on match", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-paragraph-length");
    if (!rule) throw new Error("readability-paragraph-length not found");

    const longText = "一".repeat(501);
    const el = makeElement("p", {}, [makeText(longText)]);
    const hast = makeHast([el]);
    const result = applyRuleset(hast, [rule]);
    const diag = result.report.diagnostics.find((d) => d.ruleId === "readability-paragraph-length");
    if (!diag) throw new Error("Expected diagnostic for readability-paragraph-length");
    expect(diag.severity).toBe("info");
  });
});

// ── AC-002 + AC-004: readability-font-size-min ────────────────────────────────

describe("T-061 AC-002/AC-004: readability-font-size-min produces message with actual vs threshold", () => {
  it("positive: font-size:10px → diagnostic message contains '10px' and '12px'", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-font-size-min");
    if (!rule) throw new Error("readability-font-size-min not found");

    const el = makeElement("span", { style: "font-size:10px" });
    if (!rule.diagnose) throw new Error("rule.diagnose missing");
    const diags = rule.diagnose(el);

    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("10px");
    expect(diags[0].message).toContain("12px");
  });

  it("positive: font-size:8px → message matches 'font-size: 8px < min 12px'", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-font-size-min");
    if (!rule) throw new Error("readability-font-size-min not found");

    const el = makeElement("p", { style: "font-size:8px" });
    if (!rule.diagnose) throw new Error("rule.diagnose missing");
    const diags = rule.diagnose(el);

    expect(diags[0].message).toBe("font-size: 8px < min 12px");
  });

  it("positive: font-size:11px → diagnostic (boundary: < 12 means 11 is below)", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-font-size-min");
    if (!rule) throw new Error("readability-font-size-min not found");

    const el = makeElement("p", { style: "font-size:11px" });
    if (!rule.diagnose) throw new Error("rule.diagnose missing");
    const diags = rule.diagnose(el);

    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("11px");
  });

  it("negative: font-size:14px → matcher returns false (no diagnostic)", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-font-size-min");
    if (!rule) throw new Error("readability-font-size-min not found");

    const el = makeElement("p", { style: "font-size:14px" });
    expect(rule.matcher(el)).toBe(false);
  });

  it("negative: font-size:12px → exactly at threshold, no diagnostic", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-font-size-min");
    if (!rule) throw new Error("readability-font-size-min not found");

    const el = makeElement("p", { style: "font-size:12px" });
    expect(rule.matcher(el)).toBe(false);
  });

  it("negative: non-px font-size (em) → matcher returns false", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-font-size-min");
    if (!rule) throw new Error("readability-font-size-min not found");

    const el = makeElement("p", { style: "font-size:0.8em" });
    expect(rule.matcher(el)).toBe(false);
  });

  it("negative: element without font-size → matcher returns false", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-font-size-min");
    if (!rule) throw new Error("readability-font-size-min not found");

    const el = makeElement("p", { style: "color:red" });
    expect(rule.matcher(el)).toBe(false);
  });
});

// ── AC-002 + AC-004: readability-line-height-min ──────────────────────────────

describe("T-061 AC-002/AC-004: readability-line-height-min produces message with actual vs threshold", () => {
  it("positive: line-height:1.2 → message is 'line-height: 1.2 < min 1.4'", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-line-height-min");
    if (!rule) throw new Error("readability-line-height-min not found");

    const el = makeElement("p", { style: "line-height:1.2" });
    if (!rule.diagnose) throw new Error("rule.diagnose missing");
    const diags = rule.diagnose(el);

    expect(diags).toHaveLength(1);
    expect(diags[0].message).toBe("line-height: 1.2 < min 1.4");
  });

  it("positive: line-height:1.0 → diagnostic with actual value '1' and min '1.4'", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-line-height-min");
    if (!rule) throw new Error("readability-line-height-min not found");

    const el = makeElement("div", { style: "line-height:1.0" });
    if (!rule.diagnose) throw new Error("rule.diagnose missing");
    const diags = rule.diagnose(el);

    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("1.4");
  });

  it("negative: line-height:1.6 → matcher returns false (no diagnostic)", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-line-height-min");
    if (!rule) throw new Error("readability-line-height-min not found");

    const el = makeElement("p", { style: "line-height:1.6" });
    expect(rule.matcher(el)).toBe(false);
  });

  it("negative: line-height:1.4 → exactly at threshold, no diagnostic", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-line-height-min");
    if (!rule) throw new Error("readability-line-height-min not found");

    const el = makeElement("p", { style: "line-height:1.4" });
    expect(rule.matcher(el)).toBe(false);
  });

  it("negative: line-height:20px → parseFloat gives 20, not < 1.4 — no diagnostic", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-line-height-min");
    if (!rule) throw new Error("readability-line-height-min not found");

    const el = makeElement("p", { style: "line-height:20px" });
    expect(rule.matcher(el)).toBe(false);
  });

  it("negative: element without line-height → matcher returns false", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-line-height-min");
    if (!rule) throw new Error("readability-line-height-min not found");

    const el = makeElement("p", { style: "font-size:16px" });
    expect(rule.matcher(el)).toBe(false);
  });
});

// ── AC-002 + AC-004: readability-paragraph-length ────────────────────────────

describe("T-061 AC-002/AC-004: readability-paragraph-length produces message with actual vs threshold", () => {
  it("positive: paragraph with 612 chars → message is 'paragraph length: 612 chars > max 500'", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-paragraph-length");
    if (!rule) throw new Error("readability-paragraph-length not found");

    const text612 = "一".repeat(612);
    const el = makeElement("p", {}, [makeText(text612)]);
    if (!rule.diagnose) throw new Error("rule.diagnose missing");
    const diags = rule.diagnose(el);

    expect(diags).toHaveLength(1);
    expect(diags[0].message).toBe("paragraph length: 612 chars > max 500");
  });

  it("positive: paragraph with 501 chars → diagnostic (boundary: 501 > 500)", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-paragraph-length");
    if (!rule) throw new Error("readability-paragraph-length not found");

    const text501 = "A".repeat(501);
    const el = makeElement("p", {}, [makeText(text501)]);
    if (!rule.diagnose) throw new Error("rule.diagnose missing");
    const diags = rule.diagnose(el);

    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("501");
    expect(diags[0].message).toContain("500");
  });

  it("positive: paragraph with nested spans → collects text from all descendants", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-paragraph-length");
    if (!rule) throw new Error("readability-paragraph-length not found");

    const span1 = makeElement("span", {}, [makeText("一".repeat(300))]);
    const span2 = makeElement("strong", {}, [makeText("一".repeat(250))]);
    const el = makeElement("p", {}, [span1, span2]);
    if (!rule.diagnose) throw new Error("rule.diagnose missing");
    const diags = rule.diagnose(el);

    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("550");
  });

  it("negative: paragraph with 100 chars → matcher returns false (no diagnostic)", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-paragraph-length");
    if (!rule) throw new Error("readability-paragraph-length not found");

    const el = makeElement("p", {}, [makeText("A".repeat(100))]);
    expect(rule.matcher(el)).toBe(false);
  });

  it("negative: paragraph with exactly 500 chars → no diagnostic (= threshold, not exceeds)", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-paragraph-length");
    if (!rule) throw new Error("readability-paragraph-length not found");

    const el = makeElement("p", {}, [makeText("一".repeat(500))]);
    expect(rule.matcher(el)).toBe(false);
  });

  it("negative: non-p element with long text → matcher returns false (only targets <p>)", () => {
    const rule = readabilityRules.find((r) => r.id === "readability-paragraph-length");
    if (!rule) throw new Error("readability-paragraph-length not found");

    const el = makeElement("div", {}, [makeText("A".repeat(600))]);
    expect(rule.matcher(el)).toBe(false);
  });
});

// ── AC-003: compliant inputs produce 0 diagnostics ────────────────────────────

describe("T-061 AC-003: compliant inputs (14px / 1.6 / 100 chars) produce 0 diagnostics", () => {
  it("font-size:14px → 0 diagnostics from readabilityRules", () => {
    const el = makeElement("p", { style: "font-size:14px" });
    const hast = makeHast([el]);
    const result = applyRuleset(hast, readabilityRules);
    const readabilityDiags = result.report.diagnostics.filter((d) =>
      d.ruleId.startsWith("readability-")
    );
    expect(readabilityDiags).toHaveLength(0);
  });

  it("line-height:1.6 → 0 diagnostics from readabilityRules", () => {
    const el = makeElement("p", { style: "line-height:1.6" });
    const hast = makeHast([el]);
    const result = applyRuleset(hast, readabilityRules);
    const readabilityDiags = result.report.diagnostics.filter((d) =>
      d.ruleId.startsWith("readability-")
    );
    expect(readabilityDiags).toHaveLength(0);
  });

  it("paragraph with 100 chars → 0 diagnostics from readabilityRules", () => {
    const el = makeElement("p", {}, [makeText("一".repeat(100))]);
    const hast = makeHast([el]);
    const result = applyRuleset(hast, readabilityRules);
    const readabilityDiags = result.report.diagnostics.filter((d) =>
      d.ruleId.startsWith("readability-")
    );
    expect(readabilityDiags).toHaveLength(0);
  });

  it("all three compliant values together → 0 diagnostics", () => {
    const el = makeElement("p", { style: "font-size:14px;line-height:1.6" }, [
      makeText("一".repeat(100)),
    ]);
    const hast = makeHast([el]);
    const result = applyRuleset(hast, readabilityRules);
    const readabilityDiags = result.report.diagnostics.filter((d) =>
      d.ruleId.startsWith("readability-")
    );
    expect(readabilityDiags).toHaveLength(0);
  });
});

// ── AC-005: readabilityRules integrated into builtinRules ────────────────────

describe("T-061 AC-005: readabilityRules are integrated into builtinRules (count >= 45)", () => {
  it("builtinRules includes all 3 readability rule ids", async () => {
    const { builtinRules } = await import("../../packages/ruleset/src/index.ts");
    const ids = builtinRules.map((r) => r.id);
    expect(ids).toContain("readability-font-size-min");
    expect(ids).toContain("readability-line-height-min");
    expect(ids).toContain("readability-paragraph-length");
  });

  it("builtinRules total count >= 45 after adding 3 readability rules", async () => {
    const { builtinRules } = await import("../../packages/ruleset/src/index.ts");
    expect(builtinRules.length).toBeGreaterThanOrEqual(45);
  });
});
