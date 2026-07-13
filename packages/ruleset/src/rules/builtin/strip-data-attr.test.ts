import type { Element, Root } from "hast";
import { describe, expect, it } from "vitest";
import { applyRuleset } from "../../apply.ts";
import stripDataAttr from "./strip-data-attr.ts";

function elementWithProps(properties: Element["properties"]): Root {
  return {
    type: "root",
    children: [{ type: "element", tagName: "section", properties, children: [] }],
  };
}

function propsAfterApply(properties: Element["properties"]): Element["properties"] {
  const result = applyRuleset(elementWithProps(properties), [stripDataAttr], "authoring");
  return (result.hast.children[0] as Element).properties;
}

describe("strip-data-attr: kebab-case property keys (programmatic hast construction)", () => {
  it("strips stray kebab data-* keys", () => {
    const props = propsAfterApply({ "data-tracking": "x", "data-foo": "bar" });
    expect(props).not.toHaveProperty("data-tracking");
    expect(props).not.toHaveProperty("data-foo");
  });

  it("preserves pipeline-semantic kebab keys", () => {
    const props = propsAfterApply({
      "data-block": "hero",
      "data-variant": "default",
      "data-block-slot": "body",
      "data-block-slot-last": "true",
      "data-steps-item": "1",
      "data-dialog-avatar": "a",
      "data-lh-exempt": "true",
      "data-node-id": "n-1",
      "data-compare-title": "t",
    });
    expect(Object.keys(props)).toHaveLength(9);
  });

  it("strips stray kebab keys while preserving semantic siblings on the same node", () => {
    const props = propsAfterApply({ "data-block": "hero", "data-tracking": "x" });
    expect(props).toHaveProperty("data-block", "hero");
    expect(props).not.toHaveProperty("data-tracking");
  });
});

describe("strip-data-attr: camelCase property keys (parsed-HTML hast)", () => {
  it("strips stray camelCase data keys", () => {
    const props = propsAfterApply({ dataFoo: "bar", dataTracking: "x", data123: "n" });
    expect(props).toEqual({});
  });

  it("preserves pipeline-semantic keys in camelCase notation", () => {
    const props = propsAfterApply({ dataBlock: "hero", dataBlockSlot: "body", dataFoo: "x" });
    expect(props).toHaveProperty("dataBlock", "hero");
    expect(props).toHaveProperty("dataBlockSlot", "body");
    expect(props).not.toHaveProperty("dataFoo");
  });
});

describe("strip-data-attr: non-data properties untouched", () => {
  it("leaves style/class-free regular properties alone", () => {
    const props = propsAfterApply({ style: "color: red", title: "t", "data-x": "1" });
    expect(props).toEqual({ style: "color: red", title: "t" });
  });
});
