export interface TokenDefinition {
  id: string;
  category: "color" | "spacing" | "font" | "decoration" | "alignment";
  value: string;
  themeOverrides?: Record<string, string>;
}
