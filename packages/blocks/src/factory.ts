import type {
  BlockCategory,
  BlockDecorateContext,
  BlockDefinition,
  BlockVariant,
} from "@wechat-flow/core";
import type { Element } from "hast";
import type { ZodType } from "zod";

export function defineBlock(
  id: string,
  name: string,
  directiveAttrs: ZodType,
  category: BlockCategory,
  variants: BlockVariant[],
  baseStyle?: Record<string, Record<string, string>>,
  slots?: string[],
  directiveBody?: string,
  decorate?: (element: Element, ctx: BlockDecorateContext) => void,
  defaultStyle?: Record<string, Record<string, string>>
): BlockDefinition {
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
