import type { GuardFailure, ThemeDefinition } from "@wechat-flow/contracts";
import { describeTheme, listThemes } from "../../registry/theme.ts";
import { deltaE76 } from "../lab.ts";

const COLLISION_THRESHOLD = 10;

export function checkCrossThemeIdentityTokenCollision(theme: ThemeDefinition): GuardFailure | null {
  const brand = theme.tokens?.["--color-brand"];
  if (!brand) return null;

  const registered = listThemes();
  if (registered.length === 0) return null;

  const collisions: string[] = [];
  for (const entry of registered) {
    if (entry.id === theme.id) continue;
    const other = describeTheme(entry.id);
    if (!other) continue;
    const otherBrand = other.tokens?.["--color-brand"];
    if (!otherBrand) continue;
    const de = deltaE76(brand, otherBrand);
    if (de <= COLLISION_THRESHOLD) {
      collisions.push(`${entry.id} (ΔE=${de.toFixed(2)})`);
    }
  }

  if (collisions.length === 0) return null;

  return {
    dimension: "cross-theme-identity-token-collision",
    severity: "warning",
    message: `Brand color collision with: ${collisions.join(", ")}`,
  };
}
