import { afterEach, describe, expect, it } from "vitest";
import { resetBlockRegistry } from "../../../packages/core/src/registry/block.ts";
import { isWhitelistedProperty } from "../../../packages/core/src/registry/css-property-whitelist.ts";
import {
  registerVariant,
  resetVariantRegistry,
} from "../../../packages/core/src/registry/variant.ts";
// Side-effect import registers all built-in blocks (incl. callout) so resetBlockRegistry() re-registers them.
import "../../../packages/blocks/src/index.ts";

afterEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
});

describe("AC-003: font-family 从 core CSS 属性白名单移除", () => {
  it("isWhitelistedProperty('font-family') 返回 false（customCss 声明 font-family 视为构造期不安全属性）", () => {
    expect(isWhitelistedProperty("font-family")).toBe(false);
  });

  it("isWhitelistedProperty('color') 仍返回 true（移除 font-family 不影响其余安全属性）", () => {
    expect(isWhitelistedProperty("color")).toBe(true);
  });

  it("registerVariant 对含 font-family 声明的 style 抛出异常，rejectedDeclarations 含 property='font-family' 条目", () => {
    let caught: unknown;
    try {
      registerVariant({
        blockId: "callout",
        id: "t184-font-family-reject",
        label: "T-184 Font Family Reject",
        style: { root: { "font-family": "SimSun, sans-serif", color: "#333333" } },
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(Error);
    const rejectedDeclarations = (
      caught as { rejectedDeclarations?: Array<{ property: string; slot: string; value: string }> }
    ).rejectedDeclarations;
    expect(rejectedDeclarations).toBeDefined();
    const fontFamilyRejection = rejectedDeclarations?.find((d) => d.property === "font-family");
    expect(fontFamilyRejection).toMatchObject({
      slot: "root",
      property: "font-family",
      value: "SimSun, sans-serif",
    });
  });

  it("registerVariant 在 rejectedDeclarations 中不误伤同一 variant 内的合法 color 声明", () => {
    let caught: unknown;
    try {
      registerVariant({
        blockId: "callout",
        id: "t184-font-family-reject-color-safe",
        label: "T-184 Font Family Reject Color Safe",
        style: { root: { "font-family": "SimSun, sans-serif", color: "#333333" } },
      });
    } catch (err) {
      caught = err;
    }

    const rejectedDeclarations = (caught as { rejectedDeclarations?: Array<{ property: string }> })
      .rejectedDeclarations;
    const colorRejection = rejectedDeclarations?.find((d) => d.property === "color");
    expect(colorRejection).toBeUndefined();
  });
});
