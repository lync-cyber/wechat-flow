import type { SanitizeSchema } from "@wechat-flow/contracts";
import { type Schema, defaultSchema } from "hast-util-sanitize";

const DIVIDER_SVG_TAG_NAMES = ["svg", "path", "circle", "line"];

const DIVIDER_SVG_ATTRIBUTES: NonNullable<Schema["attributes"]> = {
  svg: ["viewBox", "style"],
  path: ["d", "stroke", "fill", "strokeWidth"],
  circle: ["cx", "cy", "r", "fill", "stroke"],
  line: ["x1", "y1", "x2", "y2", "stroke"],
};

export const wechatFlowSanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), ...DIVIDER_SVG_TAG_NAMES],
  attributes: {
    ...defaultSchema.attributes,
    ...DIVIDER_SVG_ATTRIBUTES,
    "*": [
      ...(defaultSchema.attributes?.["*"] ?? []),
      "style",
      "data-block",
      "data-variant",
      "data-block-slot",
      "data-block-slot-last",
      "data-steps-item",
      "data-dialog-avatar",
    ],
  },
};

type AttributeMap = NonNullable<Schema["attributes"]>;

export function applySanitizeExtension(base: Schema, extension: SanitizeSchema): Schema {
  const mergedTagNames = [...(base.tagNames ?? []), ...(extension.tagNames ?? [])];

  const mergedAttributes: AttributeMap = { ...(base.attributes ?? {}) };

  if (extension.attributes) {
    for (const [tag, attrs] of Object.entries(extension.attributes)) {
      mergedAttributes[tag] = [...(mergedAttributes[tag] ?? []), ...attrs];
    }
  }

  return {
    ...base,
    tagNames: mergedTagNames,
    attributes: mergedAttributes,
  };
}
