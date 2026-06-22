import { describeTheme } from "@wechat-flow/core";

export function describeThemeTool(args: Record<string, unknown>) {
  const id = String(args.id ?? "");
  const theme = describeTheme(id);
  if (!theme) return { code: "E_NOT_FOUND", id };
  return {
    ...theme,
    templates: [],
  };
}
