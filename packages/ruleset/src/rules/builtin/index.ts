import type { RuleDefinition, RuleScope } from "../registry.ts";
import clampFontSize from "./clamp-font-size.ts";
import clampImageMaxWidth from "./clamp-image-max-width.ts";
import clampImageWidth from "./clamp-image-width.ts";
import clampLineHeight from "./clamp-line-height.ts";
import clampRgbaAlpha from "./clamp-rgba-alpha.ts";
import lintFilterBackdrop from "./lint-filter-backdrop.ts";
import lintGridLayout from "./lint-grid-layout.ts";
import lintPositionFixed from "./lint-position-fixed.ts";
import patchFlexToBlock from "./patch-flex-to-block.ts";
import patchPseudoElementMaterialize from "./patch-pseudo-element-materialize.ts";
import stripCssVar from "./strip-css-var.ts";
import stripFlexGap from "./strip-flex-gap.ts";
import stripFontFamily from "./strip-font-family.ts";
import stripIdAttr from "./strip-id-attr.ts";
import stripJsEvents from "./strip-js-events.ts";
import stripPosition from "./strip-position.ts";
import stripPseudoClasses from "./strip-pseudo-classes.ts";
import stripScript from "./strip-script.ts";
import stripStyleTag from "./strip-style-tag.ts";
import stripTransformOrigin from "./strip-transform-origin.ts";
import transformDataUriUnquote from "./transform-data-uri-unquote.ts";
import transformListToTable from "./transform-list-to-table.ts";
import transformSvgUrlNormalize from "./transform-svg-url-normalize.ts";
import transformSvgWhiteOffset from "./transform-svg-white-offset.ts";
import transformUlMarkerType from "./transform-ul-marker-type.ts";

const SCOPE_ORDER: Record<RuleScope, number> = {
  strip: 0,
  clamp: 1,
  transform: 2,
  patch: 3,
  lint: 4,
};

const ALL_RULES: RuleDefinition[] = [
  stripScript,
  stripStyleTag,
  stripJsEvents,
  stripCssVar,
  stripIdAttr,
  stripPosition,
  stripFlexGap,
  stripFontFamily,
  stripTransformOrigin,
  stripPseudoClasses,
  clampFontSize,
  clampLineHeight,
  clampImageWidth,
  clampImageMaxWidth,
  clampRgbaAlpha,
  transformSvgWhiteOffset,
  transformDataUriUnquote,
  transformUlMarkerType,
  transformListToTable,
  transformSvgUrlNormalize,
  patchFlexToBlock,
  patchPseudoElementMaterialize,
  lintFilterBackdrop,
  lintGridLayout,
  lintPositionFixed,
];

export const builtinRules: RuleDefinition[] = [...ALL_RULES].sort((a, b) => {
  const scopeDiff = SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope];
  if (scopeDiff !== 0) return scopeDiff;
  return b.priority - a.priority;
});
