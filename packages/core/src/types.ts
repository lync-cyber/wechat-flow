import type { renderMarkdownResponseSchema } from "@wechat-flow/contracts";
import type { z } from "zod";

export type RenderResult = z.infer<typeof renderMarkdownResponseSchema> & {
  coreVersion: string;
};

export interface RenderOptions {
  themeId?: string;
  rulesetVersion?: string;
  injectNodeIds?: boolean;
}
