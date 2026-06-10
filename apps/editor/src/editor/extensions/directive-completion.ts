import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import type { BlockDefinition } from "@wechat-flow/core/src/registry/block.ts";
import type { MarkDefinition } from "@wechat-flow/core/src/registry/mark.ts";

export interface TriggerResult {
  triggerType: "block" | "inline";
  query: string;
}

export interface Candidate {
  id: string;
  name: string;
  type: "block" | "inline";
}

export interface SnippetOptions {
  type: "block" | "inline";
  blockId: string;
  variantId?: string;
  params?: Record<string, string>;
}

export interface TriggerContext {
  triggerType: "block" | "inline";
  query: string;
  from: number;
  to: number;
  coords: { left: number; top: number } | null;
}

export interface CompletionCallbacks {
  onClose: () => void;
  onSelect: (payload: { type: "block" | "inline"; blockId: string }) => void;
  onTrigger?: (context: TriggerContext) => void;
}

export function detectDirectiveTrigger(prefix: string): TriggerResult | null {
  if (prefix.startsWith(":::")) {
    return { triggerType: "block", query: prefix.slice(3) };
  }
  const inlineMatch = /^(.*):([a-zA-Z]\w*)$/.exec(prefix);
  if (inlineMatch) {
    return { triggerType: "inline", query: inlineMatch[2] };
  }
  return null;
}

export function buildCandidates(
  triggerType: "block" | "inline",
  query: string,
  blocks: BlockDefinition[],
  marks: MarkDefinition[]
): Candidate[] {
  const q = query.toLowerCase();
  if (triggerType === "block") {
    return blocks
      .filter((b) => q === "" || b.id.toLowerCase().includes(q) || b.name.toLowerCase().includes(q))
      .map((b) => ({ id: b.id, name: b.name, type: "block" as const }));
  }
  return marks
    .filter((m) => q === "" || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q))
    .map((m) => ({ id: m.id, name: m.name, type: "inline" as const }));
}

export function buildDirectiveSnippet(options: SnippetOptions): string {
  const { type, blockId, variantId, params } = options;
  const paramsStr =
    params && Object.keys(params).length > 0
      ? `{${Object.entries(params)
          .map(([k, v]) => `${k}=${v}`)
          .join(" ")}}`
      : "";

  if (type === "block") {
    const name = variantId ? `${blockId}-${variantId}` : blockId;
    return `:::${name}${paramsStr}\n\n:::`;
  }
  return `:${blockId}[${paramsStr}]`;
}

export function registerDirectiveCompletion(callbacks: CompletionCallbacks): Extension {
  const { onClose, onTrigger } = callbacks;
  return [
    EditorView.updateListener.of((update) => {
      if (!update.docChanged && !update.selectionSet) {
        return;
      }
      const pos = update.state.selection.main.head;
      const line = update.state.doc.lineAt(pos);
      const prefix = update.state.doc.sliceString(line.from, pos);
      const trigger = detectDirectiveTrigger(prefix);
      if (!trigger) {
        onClose();
        return;
      }
      const from = trigger.triggerType === "block" ? line.from : pos - trigger.query.length - 1;
      // coordsAtPos reads layout — defer to the measure phase, not the update listener itself
      update.view.requestMeasure({
        read: (view) => {
          const coords = view.coordsAtPos(pos);
          onTrigger?.({
            triggerType: trigger.triggerType,
            query: trigger.query,
            from,
            to: pos,
            coords: coords ? { left: coords.left, top: coords.bottom } : null,
          });
        },
      });
    }),
    EditorView.domEventHandlers({
      keydown: (event) => {
        if (event.key === "Escape") {
          onClose();
        }
        return false;
      },
    }),
  ];
}
