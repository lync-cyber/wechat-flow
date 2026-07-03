import {
  type DeclarativePatchEntry,
  compilePatchEntry,
  isDeclarativePatchEntry,
} from "./patch-dsl.ts";
import { PatchLoadError } from "./patch-error.ts";
import type { RuleDefinition, RuleScope } from "./rules/registry.ts";
import { upsertRule } from "./rules/registry.ts";

export { PatchLoadError } from "./patch-error.ts";

export type PatchEntry = RuleDefinition | DeclarativePatchEntry;

export interface PatchBundle {
  version: string;
  /** DSL format version; absent means 1. */
  formatVersion?: number;
  patches: PatchEntry[];
}

const SUPPORTED_FORMAT_VERSION = 1;
const VALID_SCOPES: readonly RuleScope[] = ["strip", "clamp", "transform", "patch", "lint"];

function isExecutableRuleDefinition(entry: Record<string, unknown>): boolean {
  return typeof entry.matcher === "function" && typeof entry.transform === "function";
}

function validateExecutableEntry(entry: Record<string, unknown>): RuleDefinition {
  if (typeof entry.id !== "string" || entry.id.length === 0) {
    throw new PatchLoadError("Patch bundle schema error: each patch entry must have a string 'id'");
  }
  if (typeof entry.scope !== "string" || !VALID_SCOPES.includes(entry.scope as RuleScope)) {
    throw new PatchLoadError(
      `Patch entry '${entry.id}' has invalid 'scope': must be one of ${VALID_SCOPES.join(", ")}`
    );
  }
  if (typeof entry.priority !== "number") {
    throw new PatchLoadError(
      "Patch bundle schema error: each patch entry must have a numeric 'priority'"
    );
  }
  return entry as unknown as RuleDefinition;
}

function compileEntry(entry: unknown): RuleDefinition {
  if (typeof entry !== "object" || entry === null) {
    throw new PatchLoadError("Patch bundle schema error: each patch entry must be an object");
  }
  const e = entry as Record<string, unknown>;
  if (isExecutableRuleDefinition(e)) {
    return validateExecutableEntry(e);
  }
  if (isDeclarativePatchEntry(e)) {
    return compilePatchEntry(e);
  }
  const id = typeof e.id === "string" ? e.id : "<unnamed>";
  throw new PatchLoadError(
    `Patch entry '${id}' is not executable: provide either in-memory 'matcher'/'transform' functions (programmatic use) or a declarative 'match'/'apply' spec (JSON transport) — plain JSON cannot carry functions`
  );
}

function compileBundle(data: unknown): RuleDefinition[] {
  if (typeof data !== "object" || data === null) {
    throw new PatchLoadError("Patch bundle must be a JSON object");
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.version !== "string") {
    throw new PatchLoadError("Patch bundle schema error: 'version' must be a string");
  }
  if (obj.formatVersion !== undefined && obj.formatVersion !== SUPPORTED_FORMAT_VERSION) {
    throw new PatchLoadError(
      `Patch bundle schema error: unsupported 'formatVersion' ${String(obj.formatVersion)} ` +
        `(supported: ${SUPPORTED_FORMAT_VERSION})`
    );
  }
  if (!Array.isArray(obj.patches)) {
    throw new PatchLoadError("Patch bundle schema error: 'patches' must be an array");
  }
  return (obj.patches as unknown[]).map((entry) => compileEntry(entry));
}

export async function loadPatchBundle(url: string): Promise<PatchBundle> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new PatchLoadError(
      `Failed to fetch patch bundle from ${url}: ${(err as Error).message}`,
      { cause: err }
    );
  }

  if (!response.ok) {
    throw new PatchLoadError(
      `Failed to fetch patch bundle from ${url}: HTTP ${response.status} ${response.statusText}`
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (err) {
    throw new PatchLoadError(`Failed to parse patch bundle JSON from ${url}`, { cause: err });
  }

  compileBundle(data);
  return data as PatchBundle;
}

export function applyPatchBundle(bundle: PatchBundle): void {
  // Compile everything before mutating the registry — atomicity guarantee.
  const compiled = compileBundle(bundle);
  for (const rule of compiled) {
    upsertRule(rule);
  }
}
