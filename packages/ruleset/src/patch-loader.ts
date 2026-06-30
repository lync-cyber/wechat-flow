import type { RuleDefinition } from "./rules/registry.ts";
import { upsertRule } from "./rules/registry.ts";

export interface PatchBundle {
  version: string;
  patches: RuleDefinition[];
}

export class PatchLoadError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PatchLoadError";
  }
}

function validateBundle(data: unknown): asserts data is {
  version: string;
  patches: Array<{ id: string; scope: string; priority: number }>;
} {
  if (typeof data !== "object" || data === null) {
    throw new PatchLoadError("Patch bundle must be a JSON object");
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.version !== "string") {
    throw new PatchLoadError("Patch bundle schema error: 'version' must be a string");
  }
  if (!Array.isArray(obj.patches)) {
    throw new PatchLoadError("Patch bundle schema error: 'patches' must be an array");
  }
  for (const entry of obj.patches as unknown[]) {
    if (typeof entry !== "object" || entry === null) {
      throw new PatchLoadError("Patch bundle schema error: each patch entry must be an object");
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== "string") {
      throw new PatchLoadError(
        "Patch bundle schema error: each patch entry must have a string 'id'"
      );
    }
    if (typeof e.scope !== "string") {
      throw new PatchLoadError(
        "Patch bundle schema error: each patch entry must have a string 'scope'"
      );
    }
    if (typeof e.priority !== "number") {
      throw new PatchLoadError(
        "Patch bundle schema error: each patch entry must have a numeric 'priority'"
      );
    }
  }
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

  try {
    validateBundle(data);
  } catch (err) {
    if (err instanceof PatchLoadError) throw err;
    throw new PatchLoadError(`Patch bundle validation failed: ${(err as Error).message}`, {
      cause: err,
    });
  }

  const raw = data as { version: string; patches: Array<Record<string, unknown>> };
  return {
    version: raw.version,
    patches: raw.patches as unknown as RuleDefinition[],
  };
}

export function applyPatchBundle(bundle: PatchBundle): void {
  if (!bundle || !Array.isArray(bundle.patches)) {
    throw new PatchLoadError("Invalid PatchBundle: 'patches' must be an array");
  }

  // Validate all patches before mutating — atomicity guarantee
  for (const patch of bundle.patches) {
    if (typeof patch.id !== "string" || !patch.id) {
      throw new PatchLoadError(`Invalid patch entry: 'id' must be a non-empty string`);
    }
  }

  for (const patch of bundle.patches) {
    upsertRule(patch);
  }
}
