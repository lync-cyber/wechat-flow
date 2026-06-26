import { derivePalette } from "@wechat-flow/palette";
import type { PaletteSeed } from "@wechat-flow/palette";

export function derivePaletteTool(args: Record<string, unknown>) {
  const primary = String(args.primary ?? "");
  if (!primary) return { code: "E_INVALID_INPUT", message: "primary is required" };
  const seed: PaletteSeed = { primary };
  try {
    return derivePalette(seed);
  } catch {
    return { code: "E_INVALID_INPUT", message: `invalid primary color: ${primary}` };
  }
}
