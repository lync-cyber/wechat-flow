import type { BlockCategory, BlockSource, BlockVariant } from "@wechat-flow/core";
import { describeBlock } from "@wechat-flow/core";
import { z } from "zod";

interface DescribeBlockFields {
  id: string;
  name: string;
  category: BlockCategory;
  attrsSchema: Record<string, unknown>;
  directiveBody: string;
  variants: BlockVariant[];
  baseStyle?: Record<string, Record<string, string>>;
  slots: string[];
}

export interface DescribeBlockBuiltinResult extends DescribeBlockFields {
  source: "builtin";
}

export interface DescribeBlockPluginResult extends DescribeBlockFields {
  source: "plugin";
}

export type DescribeBlockResult =
  | DescribeBlockBuiltinResult
  | DescribeBlockPluginResult
  | { code: "E_NOT_FOUND"; blockId: string };

export function describeBlockTool(args: Record<string, unknown>): DescribeBlockResult {
  const blockId = String(args.blockId ?? "");
  const block = describeBlock(blockId);
  if (!block) return { code: "E_NOT_FOUND", blockId };

  const source: BlockSource = block.source ?? "builtin";
  const fields: DescribeBlockFields = {
    id: block.id,
    name: block.name,
    category: block.category,
    attrsSchema: z.toJSONSchema(block.directiveAttrs),
    directiveBody: block.directiveBody ?? "",
    variants: block.variants,
    baseStyle: block.baseStyle,
    slots: block.slots,
  };

  if (source === "plugin") {
    return { ...fields, source: "plugin" };
  }
  return { ...fields, source: "builtin" };
}
