export const headingH2MarkerSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="4" style="display:inline-block;vertical-align:middle;margin-right:6px"><rect width="24" height="4" rx="2" fill="{{color.brand}}"/></svg>';

export const headingH1MarkerSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="4" style="display:inline-block;vertical-align:middle;margin-right:6px"><rect width="32" height="4" rx="2" fill="{{color.accent}}"/></svg>';

export const defaultAssets: Record<string, string> = {
  "heading.h1": headingH1MarkerSvg,
  "heading.h2": headingH2MarkerSvg,
};
