import { getBlockBaseStyle } from "@wechat-flow/core";
import { describe, expect, it } from "vitest";
import "../index.ts";

describe("T-190 AC-004: fat-base 块 default 输出字节保真（golden，merge 重构前后不变）", () => {
  it("callout default 输出保真", () => {
    expect(getBlockBaseStyle("callout", "default")).toEqual({
      "border-left": "4px solid #4a90e2",
      padding: "12px 16px",
      "border-radius": "4px",
      margin: "16px 0",
      "background-color": "#f0f7ff",
    });
  });

  it("warning default 输出保真", () => {
    expect(getBlockBaseStyle("warning", "default")).toEqual({
      "border-left": "4px solid #e53e3e",
      padding: "12px 16px",
      "border-radius": "4px",
      margin: "16px 0",
      "background-color": "#fff5f5",
    });
  });

  it("announcement default 输出保真", () => {
    expect(getBlockBaseStyle("announcement", "default")).toEqual({
      "border-left": "3px solid #b94a3e",
      padding: "12px 16px",
      background: "#f3f0eb",
    });
  });

  it("compare default 输出保真", () => {
    expect(getBlockBaseStyle("compare", "default")).toEqual({
      display: "table",
      width: "100%",
      "border-collapse": "collapse",
      margin: "16px 0",
    });
  });

  it("quote default 输出保真", () => {
    expect(getBlockBaseStyle("quote", "default")).toEqual({
      "border-left": "3px solid #888",
      padding: "8px 16px",
      margin: "16px 0",
      color: "#555",
    });
  });

  it("pull-quote default 输出保真", () => {
    expect(getBlockBaseStyle("pull-quote", "default")).toEqual({
      "text-align": "center",
      padding: "24px 16px",
      margin: "24px 0",
      "font-size": "1.25em",
    });
  });
});

describe("T-190 AC-005: fat-base 块已实现具名变体 merge 后字节保真（golden，merge 重构前后不变）", () => {
  it("callout.tip 输出保真", () => {
    expect(getBlockBaseStyle("callout", "tip")).toEqual({
      padding: "12px 16px",
      margin: "16px 0",
      "border-radius": "8px 0 8px 8px",
      "box-shadow": "inset -4px 0 0 0 var(--color-brand)",
      background: "var(--color-surface-alt)",
    });
  });

  it("callout.warning 输出保真", () => {
    expect(getBlockBaseStyle("callout", "warning")).toEqual({
      padding: "12px 16px",
      margin: "16px 0",
      "border-top": "2px dashed var(--color-accent)",
      "border-bottom": "2px solid var(--color-accent)",
      background: "transparent",
    });
  });

  it("callout.info 输出保真", () => {
    expect(getBlockBaseStyle("callout", "info")).toEqual({
      padding: "12px 16px",
      margin: "16px 0",
      border: "1px solid var(--color-brand)",
      "box-shadow": "inset 0 2px 0 0 var(--color-brand), 0 1px 3px rgba(0,0,0,0.06)",
      background: "var(--color-background)",
    });
  });

  it("callout.danger 输出保真", () => {
    expect(getBlockBaseStyle("callout", "danger")).toEqual({
      padding: "12px 16px",
      margin: "16px 0",
      "border-top": "8px solid var(--color-accent)",
      "border-radius": "0",
      background: "var(--color-surface-alt)",
    });
  });

  it("announcement.danger-bar 输出保真", () => {
    expect(getBlockBaseStyle("announcement", "danger-bar")).toEqual({
      "border-top": "4px solid var(--color-accent)",
      "border-left": "3px solid var(--color-accent)",
      padding: "12px 16px",
      background: "var(--color-surface-alt)",
    });
  });

  it("announcement.compact 输出保真", () => {
    expect(getBlockBaseStyle("announcement", "compact")).toEqual({
      padding: "8px 12px",
      "border-left": "3px solid var(--color-brand)",
      "font-size": "var(--font-size-sm)",
    });
  });

  it("compare.ledger 输出保真", () => {
    expect(getBlockBaseStyle("compare", "ledger")).toEqual({
      margin: "16px 0",
    });
  });

  it("quote.large-quote-mark 输出保真", () => {
    expect(getBlockBaseStyle("quote", "large-quote-mark")).toEqual({
      padding: "8px 16px",
      margin: "16px 0",
      color: "#555",
    });
  });

  it("quote.dropcap 输出保真", () => {
    expect(getBlockBaseStyle("quote", "dropcap")).toEqual({
      padding: "8px 16px",
      margin: "16px 0",
      color: "#555",
    });
  });

  it("pull-quote.decorated 输出保真", () => {
    expect(getBlockBaseStyle("pull-quote", "decorated")).toEqual({
      "text-align": "center",
      padding: "24px 16px",
      margin: "24px 0",
      "font-size": "1.25em",
    });
  });
});

describe("T-190 AC-006: steps.card 继承块节奏 margin（merge 唯一已实现变体产物变化点）", () => {
  it("merge 后 getBlockBaseStyle('steps','card') 含块基座 margin:16px 0（replace 语义下不含此键）", () => {
    expect(getBlockBaseStyle("steps", "card")).toEqual({
      margin: "16px 0",
      padding: "12px 16px",
      background: "var(--color-surface-alt)",
      border: "1px solid #d6d3ce",
      "border-radius": "6px",
      "margin-bottom": "12px",
    });
  });
});
