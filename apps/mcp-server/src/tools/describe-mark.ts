import { describeMark } from "@wechat-flow/core";

const EMPTY_ATTRS_SCHEMA = { type: "object", properties: {} } as const;

export function describeMarkTool(args: Record<string, unknown>) {
  const markId = String(args.markId ?? "");
  const mark = describeMark(markId);
  if (!mark) return { code: "E_NOT_FOUND", markId };
  return {
    id: mark.id,
    name: mark.name,
    style: mark.style,
    attrsSchema: EMPTY_ATTRS_SCHEMA,
  };
}
