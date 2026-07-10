import {
  FORBIDDEN_CSS_PROPS,
  FORBIDDEN_DISPLAY_VALUES,
  FORBIDDEN_POSITION_PROPS,
  FORBIDDEN_VALUE_PATTERN_EXCEPTIONS,
  isForbiddenCssValue,
} from "@wechat-flow/contracts";

export interface RejectedDeclaration {
  slot: string;
  property: string;
  value: string;
  reason: string;
}

function evaluateDeclaration(
  property: string,
  rawValue: string
): { reason: string; reportedValue: string } | null {
  const trimmedValue = rawValue.trim();

  if (FORBIDDEN_CSS_PROPS.has(property)) {
    return {
      reason: `property "${property}" is on the FORBIDDEN denylist`,
      reportedValue: trimmedValue,
    };
  }
  if (property === "display" && FORBIDDEN_DISPLAY_VALUES.has(trimmedValue)) {
    return {
      reason: `display value "${trimmedValue}" is on the FORBIDDEN denylist`,
      reportedValue: trimmedValue,
    };
  }
  if (FORBIDDEN_POSITION_PROPS.has(property)) {
    return {
      reason: `property "${property}" is a forbidden position offset`,
      reportedValue: trimmedValue,
    };
  }
  if (property.startsWith("-webkit-") && !FORBIDDEN_VALUE_PATTERN_EXCEPTIONS.has(property)) {
    return {
      reason: `property "${property}" uses a forbidden -webkit- prefix`,
      reportedValue: `${property}: ${trimmedValue}`,
    };
  }
  if (isForbiddenCssValue(`${property}: ${trimmedValue}`)) {
    return {
      reason: `declaration "${property}: ${trimmedValue}" contains a forbidden value pattern`,
      reportedValue: `${property}: ${trimmedValue}`,
    };
  }
  return null;
}

export function validateForbiddenDeclarations(
  style: Record<string, Record<string, string>>
): RejectedDeclaration[] {
  const rejected: RejectedDeclaration[] = [];
  for (const [slot, declarations] of Object.entries(style)) {
    for (const [property, value] of Object.entries(declarations)) {
      const outcome = evaluateDeclaration(property, value);
      if (outcome) {
        rejected.push({ slot, property, value: outcome.reportedValue, reason: outcome.reason });
      }
    }
  }
  return rejected;
}

export function validateThemeBlocksForbidden(
  blocks: Record<string, Record<string, Record<string, string>>>
): RejectedDeclaration[] {
  const rejected: RejectedDeclaration[] = [];
  for (const [tag, variants] of Object.entries(blocks)) {
    for (const [variantKey, declarations] of Object.entries(variants)) {
      rejected.push(...validateForbiddenDeclarations({ [`${tag}.${variantKey}`]: declarations }));
    }
  }
  return rejected;
}

export function validateThemeTokensForbidden(
  tokens: Record<string, string>
): RejectedDeclaration[] {
  const rejected: RejectedDeclaration[] = [];
  for (const [tokenName, rawValue] of Object.entries(tokens)) {
    const value = rawValue.trim();
    if (FORBIDDEN_DISPLAY_VALUES.has(value)) {
      rejected.push({
        slot: "tokens",
        property: tokenName,
        value,
        reason: `token "${tokenName}" value "${value}" is a forbidden display value`,
      });
      continue;
    }
    if (isForbiddenCssValue(value)) {
      rejected.push({
        slot: "tokens",
        property: tokenName,
        value,
        reason: `token "${tokenName}" value contains a forbidden value pattern`,
      });
    }
  }
  return rejected;
}

export function parseMarkStyleDeclarations(style: string): Record<string, string> {
  const declarations: Record<string, string> = {};
  for (const segment of style.split(";")) {
    const trimmed = segment.trim();
    if (trimmed === "") continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const property = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();
    if (property === "") continue;
    declarations[property] = value;
  }
  return declarations;
}

export function validateMarkStyleForbidden(style: string): RejectedDeclaration[] {
  return validateForbiddenDeclarations({ style: parseMarkStyleDeclarations(style) });
}

export function buildRejectionError(
  message: string,
  rejectedDeclarations: RejectedDeclaration[]
): Error {
  return Object.assign(new Error(message), { rejectedDeclarations });
}
