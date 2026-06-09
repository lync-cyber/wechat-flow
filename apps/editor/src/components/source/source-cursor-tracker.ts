export interface NodeLocation {
  nodeId: string;
  sourceLine: number;
}

export function findNodeIdForLine(nodes: NodeLocation[], cursorLine: number): string | null {
  let best: NodeLocation | null = null;
  for (const node of nodes) {
    if (node.sourceLine <= cursorLine) {
      if (best === null || node.sourceLine > best.sourceLine) {
        best = node;
      }
    }
  }
  return best?.nodeId ?? null;
}

export function findSourceLineForNodeId(nodeId: string): number {
  const parts = nodeId.split(":");
  if (parts.length < 2) return 0;
  const line = Number.parseInt(parts[0], 10);
  return Number.isNaN(line) ? 0 : line;
}
