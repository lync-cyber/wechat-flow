import "@wechat-flow/blocks";
import "@wechat-flow/marks";
import { describeTheme, registerTheme } from "@wechat-flow/core";
import businessTheme from "@wechat-flow/theme-business";
import defaultTheme from "@wechat-flow/theme-default";
import literaryTheme from "@wechat-flow/theme-literary";
import magazineTheme from "@wechat-flow/theme-magazine";
import techTheme from "@wechat-flow/theme-tech";

export function registerBuiltins(): void {
  if (describeTheme("default")) return;
  registerTheme(defaultTheme);
  registerTheme(businessTheme);
  registerTheme(literaryTheme);
  registerTheme(magazineTheme);
  registerTheme(techTheme);
}
