import type { SanitizeSchema } from "@wechat-flow/contracts";
import { type Schema, defaultSchema } from "hast-util-sanitize";

export const wechatFlowSanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "style", "data-block", "data-variant"],
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
