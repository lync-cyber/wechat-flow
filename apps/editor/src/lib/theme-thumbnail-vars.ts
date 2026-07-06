export function themeThumbnailVars(
  tokens?: Record<string, string>,
  accentColor?: string
): Record<string, string> {
  return {
    "--card-accent": accentColor || tokens?.["--color-brand"] || "var(--color-brand)",
    "--thumbnail-bg": tokens?.["--color-background"] ?? "var(--color-surface)",
    "--thumbnail-surface": tokens?.["--color-surface"] ?? "var(--color-surface-sunken)",
    "--thumbnail-border": tokens?.["--color-border"] ?? "var(--color-border)",
  };
}
