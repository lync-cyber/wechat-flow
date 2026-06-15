import { findNodeIdForLine } from "../components/source/source-cursor-tracker.ts";
import type { NodeLocation } from "../components/source/source-cursor-tracker.ts";

export interface BidirectionalHighlightOptions {
  getIframe: () => HTMLIFrameElement | null;
  setCursorToLine: (line: number) => void;
  onNodeHighlight: (nodeId: string | null) => void;
}

export interface BidirectionalHighlightReturn {
  attachPreviewClickListener: () => void;
  detachPreviewClickListener: () => void;
  highlightPreviewNode: (nodes: NodeLocation[], cursorLine: number) => void;
  onIframeLoad: () => void;
}

// Highlight fade duration in ms (UC-004 constraint: no script injection into iframe)
const HIGHLIGHT_DURATION_MS = 200;

export function useBidirectionalHighlight(
  options: BidirectionalHighlightOptions
): BidirectionalHighlightReturn {
  const { getIframe, setCursorToLine, onNodeHighlight } = options;

  let clickHandler: ((e: Event) => void) | null = null;
  let loadHandler: (() => void) | null = null;

  function bindClickHandler(): void {
    const iframe = getIframe();
    const doc = iframe?.contentDocument;
    if (!doc) return;

    if (clickHandler) {
      doc.removeEventListener("click", clickHandler);
    }

    clickHandler = (e: Event) => {
      const target = e.target as { closest?: (sel: string) => Element | null } | null;
      const el = target?.closest?.("[data-node-id]");
      if (!el) return;
      const nodeId = el.getAttribute("data-node-id");
      if (!nodeId) return;
      const parts = nodeId.split(":");
      const line = Number.parseInt(parts[0], 10);
      if (!Number.isNaN(line)) {
        setCursorToLine(line);
        onNodeHighlight(nodeId);
      }
    };

    doc.addEventListener("click", clickHandler);
  }

  function attachPreviewClickListener(): void {
    const iframe = getIframe();
    if (!iframe) return;

    // Bind the click handler on the current contentDocument immediately
    bindClickHandler();

    // Re-bind on every subsequent srcdoc reload (new contentDocument each time)
    loadHandler = () => {
      bindClickHandler();
    };
    iframe.addEventListener("load", loadHandler);
  }

  function detachPreviewClickListener(): void {
    const iframe = getIframe();

    if (loadHandler) {
      iframe?.removeEventListener("load", loadHandler);
      loadHandler = null;
    }

    const doc = iframe?.contentDocument;
    if (doc && clickHandler) {
      doc.removeEventListener("click", clickHandler);
    }
    clickHandler = null;
  }

  // Exposed for testing: simulates what the iframe 'load' listener does
  function onIframeLoad(): void {
    bindClickHandler();
  }

  function highlightPreviewNode(nodes: NodeLocation[], cursorLine: number): void {
    const iframe = getIframe();
    const doc = iframe?.contentDocument;
    if (!doc) return;

    const nodeId = findNodeIdForLine(nodes, cursorLine);
    if (!nodeId) return;

    const el = doc.querySelector(`[data-node-id="${nodeId}"]`);
    if (!el) return;

    el.classList.add("cm-highlighted");
    onNodeHighlight(nodeId);

    setTimeout(() => {
      el.classList.remove("cm-highlighted");
    }, HIGHLIGHT_DURATION_MS);
  }

  return {
    attachPreviewClickListener,
    detachPreviewClickListener,
    highlightPreviewNode,
    onIframeLoad,
  };
}
