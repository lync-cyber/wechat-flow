import type {
  BlockCategory,
  BlockDecorateContext,
  BlockDefinition,
  BlockVariant,
} from "@wechat-flow/core";
import type { Element } from "hast";
import type { ZodType } from "zod";

export interface DefineBlockOptions {
  baseStyle?: Record<string, Record<string, string>>;
  slots?: string[];
  directiveBody?: string;
  decorate?: (element: Element, ctx: BlockDecorateContext) => void;
  defaultStyle?: Record<string, Record<string, string>>;
}

export function defineBlock(
  id: string,
  name: string,
  directiveAttrs: ZodType,
  category: BlockCategory,
  variants: BlockVariant[],
  options?: DefineBlockOptions
): BlockDefinition {
  const { baseStyle, slots, directiveBody, decorate, defaultStyle } = options ?? {};
  const resolvedSlots = slots ?? Array.from(new Set(["root", ...Object.keys(baseStyle ?? {})]));
  return {
    id,
    name,
    directiveAttrs,
    category,
    variants,
    baseStyle,
    defaultStyle,
    slots: resolvedSlots,
    source: "builtin",
    directiveBody,
    decorate,
  };
}
