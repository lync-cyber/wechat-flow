import { type RenderResult, renderMarkdown } from "@wechat-flow/core";
import type { NodeLocation } from "../components/source/source-cursor-tracker.ts";

export interface ComposeRenderInput {
  markdown: string;
  themeId?: string;
  injectNodeIds?: boolean;
}

export interface VersionTriple {
  coreVersion: string;
  themeVersion: string;
  rulesetVersion: string;
}

export type ComposeRenderResult = RenderResult & {
  versionTriple: VersionTriple;
  nodeLocations: NodeLocation[];
};

function extractNodeLocations(html: string): NodeLocation[] {
  const locations: NodeLocation[] = [];
  for (const match of html.matchAll(/data-node-id="(\d+:\d+)"/g)) {
    const nodeId = match[1];
    const sourceLine = Number.parseInt(nodeId.split(":")[0], 10);
    locations.push({ nodeId, sourceLine });
  }
  return locations;
}

export async function composeRender(input: ComposeRenderInput): Promise<ComposeRenderResult> {
  const raw = await renderMarkdown(input.markdown, {
    themeId: input.themeId,
    injectNodeIds: input.injectNodeIds,
  });
  const nodeLocations = input.injectNodeIds ? extractNodeLocations(raw.html) : [];
  return {
    ...raw,
    versionTriple: {
      coreVersion: raw.coreVersion,
      themeVersion: raw.themeVersion,
      rulesetVersion: raw.rulesetVersion,
    },
    nodeLocations,
  };
}
