import * as fs from "node:fs";
import * as path from "node:path";
import { checkManifestVariantIntents } from "@wechat-flow/plugin-api";

export interface ValidateResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function readManifest(
  packDir: string
): { ok: true; manifest: Record<string, unknown> } | { ok: false; error: string } {
  const manifestPath = path.join(packDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    return { ok: false, error: "E_MANIFEST_INVALID: manifest.json not found" };
  }
  let raw: string;
  try {
    raw = fs.readFileSync(manifestPath, "utf-8");
  } catch {
    return { ok: false, error: "E_MANIFEST_INVALID: cannot read manifest.json" };
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return { ok: true, manifest: parsed };
  } catch {
    return { ok: false, error: "E_MANIFEST_INVALID: manifest.json is not valid JSON" };
  }
}

export function runValidate(packDir: string): ValidateResult {
  // Step 1 & 2: read + validate manifest (schema check)
  const manifestResult = readManifest(packDir);
  if (!manifestResult.ok) {
    return { exitCode: 1, stdout: "", stderr: manifestResult.error };
  }
  const manifest = manifestResult.manifest;

  // Step 1: required field 'name'
  if (typeof manifest.name !== "string" || manifest.name.trim() === "") {
    return {
      exitCode: 1,
      stdout: "",
      stderr: "E_MANIFEST_INVALID: missing required field 'name'",
    };
  }

  // Step 3: theme guard / variant intent consistency
  const manifestForCheck = {
    id: typeof manifest.id === "string" ? manifest.id : String(manifest.name),
    intents:
      manifest.intents != null &&
      typeof manifest.intents === "object" &&
      !Array.isArray(manifest.intents)
        ? (manifest.intents as { variants?: Array<{ blockId: string; variantId: string }> })
        : undefined,
  };

  const warnings = checkManifestVariantIntents(manifestForCheck, []);
  if (warnings.length > 0) {
    const details = warnings
      .map((w) => `  ${w.code}: block=${w.blockId} variant=${w.variantId}`)
      .join("\n");
    return {
      exitCode: 1,
      stdout: "",
      stderr: `E_MANIFEST_VARIANT_MISMATCH: variant intent mismatch\n${details}`,
    };
  }

  return {
    exitCode: 0,
    stdout: "通过：manifest ✓ schema ✓ 主题守护 ✓",
    stderr: "",
  };
}
