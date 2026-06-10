/** CSS custom property token dictionary: maps CSS variable names to hex color values. */
export type TokenDictionary = Record<string, string>;

export interface PaletteSeed {
  primary: string;
  secondary?: string;
  accent?: string;
  dark?: string;
}
