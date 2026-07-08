import type { Element, Node } from "hast";
import { PatchLoadError } from "./patch-error.ts";
import {
  clampPxProp,
  hasStyleProp,
  parseDeclarations,
  removeCssDeclarations,
  serializeDeclarations,
} from "./rules/builtin/css-helpers.ts";
import type { RuleDefinition, RuleScope } from "./rules/registry.ts";

export type PatchMatcherSpec =
  | { type: "style-prop"; props: string[] }
  | { type: "tag"; tags: string[] }
  | { type: "attr"; attrs: string[] }
  | { type: "and"; all: PatchMatcherSpec[] }
  | { type: "or"; any: PatchMatcherSpec[] };

export interface PatchTransformSpec {
  transform: string;
  params?: Record<string, unknown>;
}

export type DeclarativePatchScope = Exclude<RuleScope, "lint">;

export interface DeclarativePatchEntry {
  id: string;
  scope: DeclarativePatchScope;
  priority: number;
  match: PatchMatcherSpec;
  apply: PatchTransformSpec;
}

export type PatchTransformFactory = (
  params: Record<string, unknown>
) => (node: Node) => Node | null;

const transformRegistry = new Map<string, PatchTransformFactory>();

export function registerPatchTransform(id: string, factory: PatchTransformFactory): void {
  transformRegistry.set(id, factory);
}

export function getRegisteredPatchTransformIds(): readonly string[] {
  return [...transformRegistry.keys()];
}

function requireStringArray(params: Record<string, unknown>, key: string): string[] {
  const value = params[key];
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((v) => typeof v !== "string" || v.length === 0)
  ) {
    throw new Error(`param '${key}' must be a non-empty string array`);
  }
  return value as string[];
}

function requireString(params: Record<string, unknown>, key: string): string {
  const value = params[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`param '${key}' must be a non-empty string`);
  }
  return value;
}

function requireNumber(params: Record<string, unknown>, key: string): number {
  const value = params[key];
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`param '${key}' must be a number`);
  }
  return value;
}

registerPatchTransform("remove-css-declarations", (params) => {
  const props = requireStringArray(params, "props");
  return (node) => removeCssDeclarations(node, props);
});

registerPatchTransform("clamp-px", (params) => {
  const props = requireStringArray(params, "props");
  const minPx = requireNumber(params, "minPx");
  const maxPx = requireNumber(params, "maxPx");
  return (node) => clampPxProp(node, props, minPx, maxPx);
});

registerPatchTransform("set-style-property", (params) => {
  const prop = requireString(params, "prop");
  const value = requireString(params, "value");
  return (node) => {
    if (node.type !== "element") return node;
    const element = node as Element;
    const style = String(element.properties?.style ?? "");
    const decls = parseDeclarations(style).filter(([name]) => name !== prop);
    decls.push([prop, value]);
    return {
      ...element,
      properties: { ...element.properties, style: serializeDeclarations(decls) },
    };
  };
});

registerPatchTransform("remove-attributes", (params) => {
  const attrs = requireStringArray(params, "attrs");
  return (node) => {
    if (node.type !== "element") return node;
    const element = node as Element;
    const properties = { ...element.properties };
    for (const attr of attrs) delete properties[attr];
    return { ...element, properties };
  };
});

registerPatchTransform("drop-node", () => () => null);

function isElement(node: Node): node is Element {
  return node.type === "element";
}

function compileMatcher(spec: unknown, entryId: string): (node: Node) => boolean {
  if (
    typeof spec !== "object" ||
    spec === null ||
    typeof (spec as { type?: unknown }).type !== "string"
  ) {
    throw new PatchLoadError(
      `Patch entry '${entryId}': 'match' must be an object with a string 'type'`
    );
  }
  const matcher = spec as Record<string, unknown> & { type: string };
  try {
    switch (matcher.type) {
      case "style-prop": {
        const props = requireStringArray(matcher, "props");
        return (node) => isElement(node) && hasStyleProp(node, props);
      }
      case "tag": {
        const tags = requireStringArray(matcher, "tags");
        const tagSet = new Set(tags.map((t) => t.toLowerCase()));
        return (node) => isElement(node) && tagSet.has(node.tagName.toLowerCase());
      }
      case "attr": {
        const attrs = requireStringArray(matcher, "attrs");
        return (node) =>
          isElement(node) && attrs.some((attr) => node.properties?.[attr] !== undefined);
      }
      case "and": {
        const children = compileMatcherList(matcher.all, entryId, "all");
        return (node) => children.every((child) => child(node));
      }
      case "or": {
        const children = compileMatcherList(matcher.any, entryId, "any");
        return (node) => children.some((child) => child(node));
      }
      default:
        throw new Error(`unknown matcher type '${matcher.type}'`);
    }
  } catch (err) {
    if (err instanceof PatchLoadError) throw err;
    throw new PatchLoadError(
      `Patch entry '${entryId}' has an invalid 'match': ${(err as Error).message}`,
      { cause: err }
    );
  }
}

function compileMatcherList(
  value: unknown,
  entryId: string,
  key: string
): Array<(node: Node) => boolean> {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`'${key}' must be a non-empty array of matcher specs`);
  }
  return value.map((child) => compileMatcher(child, entryId));
}

function compileTransform(spec: unknown, entryId: string): (node: Node) => Node | null {
  if (
    typeof spec !== "object" ||
    spec === null ||
    typeof (spec as { transform?: unknown }).transform !== "string"
  ) {
    throw new PatchLoadError(
      `Patch entry '${entryId}': 'apply' must be an object with a string 'transform'`
    );
  }
  const { transform, params } = spec as PatchTransformSpec;
  const factory = transformRegistry.get(transform);
  if (!factory) {
    throw new PatchLoadError(
      `Patch entry '${entryId}' references unregistered transform '${transform}' — ` +
        `only pre-registered transform ids are allowed (registered: ${getRegisteredPatchTransformIds().join(", ")})`
    );
  }
  try {
    return factory(params ?? {});
  } catch (err) {
    throw new PatchLoadError(
      `Patch entry '${entryId}' has invalid params for transform '${transform}': ${(err as Error).message}`,
      { cause: err }
    );
  }
}

const DECLARATIVE_SCOPES: readonly DeclarativePatchScope[] = [
  "strip",
  "clamp",
  "transform",
  "patch",
];

export function isDeclarativePatchEntry(entry: unknown): boolean {
  if (typeof entry !== "object" || entry === null) return false;
  const e = entry as Record<string, unknown>;
  return e.match !== undefined || e.apply !== undefined;
}

export function compilePatchEntry(entry: unknown): RuleDefinition {
  if (typeof entry !== "object" || entry === null) {
    throw new PatchLoadError("Patch bundle schema error: each patch entry must be an object");
  }
  const e = entry as Record<string, unknown>;
  if (typeof e.id !== "string" || e.id.length === 0) {
    throw new PatchLoadError("Patch bundle schema error: each patch entry must have a string 'id'");
  }
  const id = e.id;
  if (
    typeof e.scope !== "string" ||
    !DECLARATIVE_SCOPES.includes(e.scope as DeclarativePatchScope)
  ) {
    throw new PatchLoadError(
      `Patch entry '${id}' has invalid 'scope': declarative entries accept ${DECLARATIVE_SCOPES.join(
        ", "
      )} ('lint' needs a diagnose function and cannot be transported as JSON)`
    );
  }
  if (typeof e.priority !== "number") {
    throw new PatchLoadError(`Patch entry '${id}' must have a numeric 'priority'`);
  }
  const matcher = compileMatcher(e.match, id);
  const transform = compileTransform(e.apply, id);
  return {
    id,
    scope: e.scope as RuleScope,
    stage: "authoring",
    priority: e.priority,
    matcher,
    transform,
  };
}
