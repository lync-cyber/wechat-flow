export const PAINTABLE_SEMANTIC_TOKENS = [
  "--color-brand",
  "--color-accent",
  "--color-text-primary",
  "--color-surface",
  "--color-success",
  "--color-link",
] as const;

const BACKGROUND_TOKENS = new Set(["--color-surface", "--color-background"]);

export function isBackgroundToken(token: string): boolean {
  return BACKGROUND_TOKENS.has(token);
}
