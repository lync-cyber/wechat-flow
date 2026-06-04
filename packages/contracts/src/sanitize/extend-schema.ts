export interface SanitizeSchema {
  tagNames?: string[];
  attributes?: Record<string, readonly string[]>;
}

export function extendSanitizeSchema(
  tagSet: ReadonlySet<string>,
  attrMap: ReadonlyMap<string, readonly string[]>
): SanitizeSchema {
  const tagNames = Array.from(tagSet);
  const attributes: Record<string, readonly string[]> = {};
  for (const [tag, attrs] of attrMap) {
    attributes[tag] = attrs;
  }
  return { tagNames, attributes };
}
