import type { GuardFailure, ThemeDefinition } from "@wechat-flow/contracts";
import { checkWcagPairs } from "../contrast.ts";

const DIMENSION = "wcag-contrast";

export function checkWcagContrast(theme: ThemeDefinition): GuardFailure | null {
  const t = theme.tokens ?? {};

  return checkWcagPairs(
    [
      {
        fg: t["--color-text-primary"] ?? "",
        bg: t["--color-background"] ?? "",
        label: "--color-text-primary vs --color-background",
      },
      {
        fg: t["--color-text-secondary"] ?? "",
        bg: t["--color-background"] ?? "",
        label: "--color-text-secondary vs --color-background",
      },
      {
        fg: t["--color-link"] ?? "",
        bg: t["--color-background"] ?? "",
        label: "--color-link vs --color-background",
      },
      {
        fg: t["--color-code-text"] ?? "",
        bg: t["--color-code-bg"] ?? "",
        label: "--color-code-text vs --color-code-bg",
      },
      {
        fg: t["--color-text-secondary"] ?? "",
        bg: t["--color-quote-bg"] ?? "",
        label: "--color-text-secondary vs --color-quote-bg",
      },
    ],
    DIMENSION
  );
}
