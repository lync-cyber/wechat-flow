import type { RuleDefinition, RuleScope } from "../registry.ts";
import clampBorderRadius from "./clamp-border-radius.ts";
import clampFontSize from "./clamp-font-size.ts";
import clampImageMaxWidth from "./clamp-image-max-width.ts";
import clampImageWidth from "./clamp-image-width.ts";
import clampLetterSpacing from "./clamp-letter-spacing.ts";
import clampLineHeight from "./clamp-line-height.ts";
import clampMarginTopBottom from "./clamp-margin-top-bottom.ts";
import clampPadding from "./clamp-padding.ts";
import clampRgbaAlpha from "./clamp-rgba-alpha.ts";
import clampTextIndent from "./clamp-text-indent.ts";
import clampWordSpacing from "./clamp-word-spacing.ts";
import lintFilterBackdrop from "./lint-filter-backdrop.ts";
import lintGridLayout from "./lint-grid-layout.ts";
import lintPositionFixed from "./lint-position-fixed.ts";
import patchFlexToBlock from "./patch-flex-to-block.ts";
import patchPseudoElementMaterialize from "./patch-pseudo-element-materialize.ts";
import stripAriaHidden from "./strip-aria-hidden.ts";
import stripCalcExpression from "./strip-calc-expression.ts";
import stripCssVar from "./strip-css-var.ts";
import stripDataAttr from "./strip-data-attr.ts";
import stripFlexGap from "./strip-flex-gap.ts";
import stripFontFamily from "./strip-font-family.ts";
import stripIdAttr from "./strip-id-attr.ts";
import stripJsEvents from "./strip-js-events.ts";
import stripNegativeMargin from "./strip-negative-margin.ts";
import stripPosition from "./strip-position.ts";
import stripPseudoClasses from "./strip-pseudo-classes.ts";
import stripScript from "./strip-script.ts";
import stripStyleTag from "./strip-style-tag.ts";
import stripTransformOrigin from "./strip-transform-origin.ts";
import stripWidthHeightInline from "./strip-width-height-inline.ts";
import transformDataUriUnquote from "./transform-data-uri-unquote.ts";
import transformEmToPx from "./transform-em-to-px.ts";
import transformHslToRgb from "./transform-hsl-to-rgb.ts";
import transformListToTable from "./transform-list-to-table.ts";
import transformRemToPx from "./transform-rem-to-px.ts";
import transformSvgUrlNormalize from "./transform-svg-url-normalize.ts";
import transformSvgWhiteOffset from "./transform-svg-white-offset.ts";
import transformUlMarkerType from "./transform-ul-marker-type.ts";
import transformUppercaseHexLower from "./transform-uppercase-hex-lower.ts";
import transformVhFallback from "./transform-vh-fallback.ts";
import transformVwToPercent from "./transform-vw-to-percent.ts";

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
  stripDataAttr,
  stripAriaHidden,
  stripWidthHeightInline,
  stripNegativeMargin,
  stripCalcExpression,
  clampFontSize,
  clampLineHeight,
  clampImageWidth,
  clampImageMaxWidth,
  clampRgbaAlpha,
  clampLetterSpacing,
  clampBorderRadius,
  clampPadding,
  clampMarginTopBottom,
  clampWordSpacing,
  clampTextIndent,
  transformSvgWhiteOffset,
  transformDataUriUnquote,
  transformUlMarkerType,
  transformListToTable,
  transformSvgUrlNormalize,
  transformRemToPx,
  transformEmToPx,
  transformVwToPercent,
  transformVhFallback,
  transformHslToRgb,
  transformUppercaseHexLower,
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
