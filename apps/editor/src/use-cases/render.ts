import { type RenderResult, renderMarkdown } from "@wechat-flow/core";

export interface ComposeRenderInput {
  markdown: string;
  themeId?: string;
}

export interface VersionTriple {
  coreVersion: string;
  themeVersion: string;
  rulesetVersion: string;
}

export type ComposeRenderResult = RenderResult & { versionTriple: VersionTriple };

export async function composeRender(input: ComposeRenderInput): Promise<ComposeRenderResult> {
  const raw = await renderMarkdown(input.markdown, { themeId: input.themeId });
  return {
    ...raw,
    versionTriple: {
      coreVersion: raw.coreVersion,
      themeVersion: raw.themeVersion,
      rulesetVersion: raw.rulesetVersion,
    },
  };
}
