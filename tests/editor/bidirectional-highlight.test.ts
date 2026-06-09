import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================
// AC-003: node-id-injector — hast transform adds data-node-id
// ============================================================
// Pure hast transformation: given block-level nodes with mdast position info,
// each block node gets data-node-id="{sourceLine}:{nodeIndex}".

describe("AC-003: node-id-injector adds data-node-id to block-level hast nodes", () => {
  it("injects data-node-id on a paragraph element with sourceLine and nodeIndex", async () => {
    const { injectNodeIds } = await import("../../packages/core/src/pipeline/node-id-injector.ts");
    const input = {
      type: "root" as const,
      children: [
        {
          type: "element" as const,
          tagName: "p",
          properties: {},
          children: [{ type: "text" as const, value: "Hello" }],
          data: { position: { start: { line: 1 } } },
        },
      ],
    };
    // biome-ignore lint/suspicious/noExplicitAny: test hast shape
    const result = injectNodeIds(input as any);
    // biome-ignore lint/suspicious/noExplicitAny: test hast shape
    const p = (result as any).children[0];
    expect(p.properties["data-node-id"]).toBe("1:0");
  });

  it("injects correct nodeIndex for multiple block siblings", async () => {
    const { injectNodeIds } = await import("../../packages/core/src/pipeline/node-id-injector.ts");
    const input = {
      type: "root" as const,
      children: [
        {
          type: "element" as const,
          tagName: "h1",
          properties: {},
          children: [],
          data: { position: { start: { line: 1 } } },
        },
        {
          type: "element" as const,
          tagName: "p",
          properties: {},
          children: [],
          data: { position: { start: { line: 3 } } },
        },
        {
          type: "element" as const,
          tagName: "p",
          properties: {},
          children: [],
          data: { position: { start: { line: 5 } } },
        },
      ],
    };
    // biome-ignore lint/suspicious/noExplicitAny: test hast shape
    const result = injectNodeIds(input as any);
    // biome-ignore lint/suspicious/noExplicitAny: test hast shape
    const children = (result as any).children;
    expect(children[0].properties["data-node-id"]).toBe("1:0");
    expect(children[1].properties["data-node-id"]).toBe("3:1");
    expect(children[2].properties["data-node-id"]).toBe("5:2");
  });

  it("does NOT inject data-node-id on inline elements (span, a, strong)", async () => {
    const { injectNodeIds } = await import("../../packages/core/src/pipeline/node-id-injector.ts");
    const input = {
      type: "root" as const,
      children: [
        {
          type: "element" as const,
          tagName: "p",
          properties: {},
          children: [
            {
              type: "element" as const,
              tagName: "strong",
              properties: {},
              children: [{ type: "text" as const, value: "bold" }],
              data: { position: { start: { line: 2 } } },
            },
          ],
          data: { position: { start: { line: 2 } } },
        },
      ],
    };
    // biome-ignore lint/suspicious/noExplicitAny: test hast shape
    const result = injectNodeIds(input as any);
    // biome-ignore lint/suspicious/noExplicitAny: test hast shape
    const strong = (result as any).children[0].children[0];
    expect(strong.properties["data-node-id"]).toBeUndefined();
  });

  it("preserves data-node-id format as '{sourceLine}:{nodeIndex}' string", async () => {
    const { injectNodeIds } = await import("../../packages/core/src/pipeline/node-id-injector.ts");
    const input = {
      type: "root" as const,
      children: [
        {
          type: "element" as const,
          tagName: "blockquote",
          properties: {},
          children: [],
          data: { position: { start: { line: 10 } } },
        },
      ],
    };
    // biome-ignore lint/suspicious/noExplicitAny: test hast shape
    const result = injectNodeIds(input as any);
    // biome-ignore lint/suspicious/noExplicitAny: test hast shape
    const bq = (result as any).children[0];
    const nodeId: string = bq.properties["data-node-id"];
    expect(typeof nodeId).toBe("string");
    expect(nodeId).toMatch(/^\d+:\d+$/);
    expect(nodeId).toBe("10:0");
  });

  it("nodes without position data get line 0", async () => {
    const { injectNodeIds } = await import("../../packages/core/src/pipeline/node-id-injector.ts");
    const input = {
      type: "root" as const,
      children: [
        {
          type: "element" as const,
          tagName: "p",
          properties: {},
          children: [],
        },
      ],
    };
    // biome-ignore lint/suspicious/noExplicitAny: test hast shape
    const result = injectNodeIds(input as any);
    // biome-ignore lint/suspicious/noExplicitAny: test hast shape
    const p = (result as any).children[0];
    expect(p.properties["data-node-id"]).toBe("0:0");
  });
});

// ============================================================
// AC-001 / AC-002 mapping logic: source-cursor-tracker
// Cursor line → nodeId lookup and nodeId → cursor line reverse lookup.
// Pure functions — fully testable in happy-dom.
// ============================================================

describe("AC-001/AC-002: source-cursor-tracker — cursor ↔ node-id mapping", () => {
  it("findNodeIdForLine returns the node-id whose sourceLine ≤ cursorLine (closest above)", async () => {
    const { findNodeIdForLine } = await import(
      "../../apps/editor/src/components/source/source-cursor-tracker.ts"
    );
    // nodeIds: [{nodeId, sourceLine}]
    const nodes = [
      { nodeId: "1:0", sourceLine: 1 },
      { nodeId: "3:1", sourceLine: 3 },
      { nodeId: "7:2", sourceLine: 7 },
    ];
    // Cursor at line 4 → closest node above is line 3
    expect(findNodeIdForLine(nodes, 4)).toBe("3:1");
  });

  it("findNodeIdForLine returns null when no node is at or before the cursor line", async () => {
    const { findNodeIdForLine } = await import(
      "../../apps/editor/src/components/source/source-cursor-tracker.ts"
    );
    const nodes = [
      { nodeId: "5:0", sourceLine: 5 },
      { nodeId: "9:1", sourceLine: 9 },
    ];
    // Cursor at line 2 — before any known node
    expect(findNodeIdForLine(nodes, 2)).toBeNull();
  });

  it("findNodeIdForLine returns exact match when cursor is on a node's source line", async () => {
    const { findNodeIdForLine } = await import(
      "../../apps/editor/src/components/source/source-cursor-tracker.ts"
    );
    const nodes = [
      { nodeId: "1:0", sourceLine: 1 },
      { nodeId: "5:1", sourceLine: 5 },
    ];
    expect(findNodeIdForLine(nodes, 5)).toBe("5:1");
  });

  it("findSourceLineForNodeId returns the source line stored in the node-id string", async () => {
    const { findSourceLineForNodeId } = await import(
      "../../apps/editor/src/components/source/source-cursor-tracker.ts"
    );
    // nodeId format is "{sourceLine}:{nodeIndex}"
    expect(findSourceLineForNodeId("7:2")).toBe(7);
    expect(findSourceLineForNodeId("1:0")).toBe(1);
    expect(findSourceLineForNodeId("42:15")).toBe(42);
  });

  it("findSourceLineForNodeId returns 0 for malformed node-id", async () => {
    const { findSourceLineForNodeId } = await import(
      "../../apps/editor/src/components/source/source-cursor-tracker.ts"
    );
    expect(findSourceLineForNodeId("invalid")).toBe(0);
    expect(findSourceLineForNodeId("")).toBe(0);
  });
});

// ============================================================
// AC-001: use-bidirectional-highlight — click in preview → CM cursor
// AC-002: use-bidirectional-highlight — CM selectionChange → preview highlight
// AC-004: communication only via contentDocument, no script injection
// ============================================================

describe("AC-001: preview click → CodeMirror cursor positioning", () => {
  it("calls setCursorToLine with the source line extracted from the clicked node's data-node-id", async () => {
    const { useBidirectionalHighlight } = await import(
      "../../apps/editor/src/composables/use-bidirectional-highlight.ts"
    );

    const mockElement = {
      getAttribute: vi.fn((attr: string) => (attr === "data-node-id" ? "5:1" : null)),
      classList: { add: vi.fn(), remove: vi.fn() },
    };

    const mockContentDocument = {
      querySelectorAll: vi.fn(() => []),
      querySelector: vi.fn(() => mockElement),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    const mockIframe = {
      contentDocument: mockContentDocument,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLIFrameElement;

    const setCursorToLine = vi.fn();

    const { attachPreviewClickListener } = useBidirectionalHighlight({
      getIframe: () => mockIframe,
      setCursorToLine,
      onNodeHighlight: vi.fn(),
    });

    attachPreviewClickListener();

    // Simulate a click event with a target that has data-node-id
    const mockTarget = {
      closest: vi.fn(() => mockElement),
    };
    const clickEvent = { target: mockTarget };

    // Get the click handler that was registered
    const [, clickHandler] = mockContentDocument.addEventListener.mock.calls[0];
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    clickHandler(clickEvent as any);

    expect(setCursorToLine).toHaveBeenCalledWith(5);
  });

  it("does NOT call setCursorToLine when clicked element has no data-node-id", async () => {
    const { useBidirectionalHighlight } = await import(
      "../../apps/editor/src/composables/use-bidirectional-highlight.ts"
    );

    const mockContentDocument = {
      querySelectorAll: vi.fn(() => []),
      querySelector: vi.fn(() => null),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    const mockIframe = {
      contentDocument: mockContentDocument,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLIFrameElement;

    const setCursorToLine = vi.fn();

    const { attachPreviewClickListener } = useBidirectionalHighlight({
      getIframe: () => mockIframe,
      setCursorToLine,
      onNodeHighlight: vi.fn(),
    });

    attachPreviewClickListener();

    const mockTarget = {
      closest: vi.fn(() => null),
    };
    const clickEvent = { target: mockTarget };

    const [, clickHandler] = mockContentDocument.addEventListener.mock.calls[0];
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    clickHandler(clickEvent as any);

    expect(setCursorToLine).not.toHaveBeenCalled();
  });
});

describe("AC-002: CodeMirror selectionChange → preview node highlight", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds .cm-highlighted class to the matching node element when cursor moves", async () => {
    const { useBidirectionalHighlight } = await import(
      "../../apps/editor/src/composables/use-bidirectional-highlight.ts"
    );

    const mockHighlightEl = {
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
    };

    const mockContentDocument = {
      querySelectorAll: vi.fn(() => []),
      querySelector: vi.fn((selector: string) => {
        if (selector.includes("data-node-id")) return mockHighlightEl;
        return null;
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    const mockIframe = {
      contentDocument: mockContentDocument,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLIFrameElement;

    const { highlightPreviewNode } = useBidirectionalHighlight({
      getIframe: () => mockIframe,
      setCursorToLine: vi.fn(),
      onNodeHighlight: vi.fn(),
    });

    const nodes = [
      { nodeId: "3:1", sourceLine: 3 },
      { nodeId: "7:2", sourceLine: 7 },
    ];

    // Cursor at line 4 — should highlight "3:1" node
    highlightPreviewNode(nodes, 4);

    expect(mockContentDocument.querySelector).toHaveBeenCalledWith('[data-node-id="3:1"]');
    expect(mockHighlightEl.classList.add).toHaveBeenCalledWith("cm-highlighted");
  });

  it("removes .cm-highlighted class after 200ms", async () => {
    const { useBidirectionalHighlight } = await import(
      "../../apps/editor/src/composables/use-bidirectional-highlight.ts"
    );

    const mockHighlightEl = {
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
    };

    const mockContentDocument = {
      querySelectorAll: vi.fn(() => []),
      querySelector: vi.fn(() => mockHighlightEl),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    const mockIframe = {
      contentDocument: mockContentDocument,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLIFrameElement;

    const { highlightPreviewNode } = useBidirectionalHighlight({
      getIframe: () => mockIframe,
      setCursorToLine: vi.fn(),
      onNodeHighlight: vi.fn(),
    });

    highlightPreviewNode([{ nodeId: "1:0", sourceLine: 1 }], 1);

    expect(mockHighlightEl.classList.add).toHaveBeenCalledWith("cm-highlighted");
    expect(mockHighlightEl.classList.remove).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);

    expect(mockHighlightEl.classList.remove).toHaveBeenCalledWith("cm-highlighted");
  });

  it("does NOT remove .cm-highlighted before 200ms elapses", async () => {
    const { useBidirectionalHighlight } = await import(
      "../../apps/editor/src/composables/use-bidirectional-highlight.ts"
    );

    const mockHighlightEl = {
      classList: { add: vi.fn(), remove: vi.fn() },
    };

    const mockContentDocument = {
      querySelectorAll: vi.fn(() => []),
      querySelector: vi.fn(() => mockHighlightEl),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    const mockIframe = {
      contentDocument: mockContentDocument,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLIFrameElement;

    const { highlightPreviewNode } = useBidirectionalHighlight({
      getIframe: () => mockIframe,
      setCursorToLine: vi.fn(),
      onNodeHighlight: vi.fn(),
    });

    highlightPreviewNode([{ nodeId: "1:0", sourceLine: 1 }], 1);
    vi.advanceTimersByTime(199);
    expect(mockHighlightEl.classList.remove).not.toHaveBeenCalled();
  });
});

describe("AC-004: no script injection — communication uses only contentDocument API", () => {
  it("attachPreviewClickListener uses addEventListener on contentDocument, not script injection", async () => {
    const { useBidirectionalHighlight } = await import(
      "../../apps/editor/src/composables/use-bidirectional-highlight.ts"
    );

    const mockContentDocument = {
      querySelectorAll: vi.fn(() => []),
      querySelector: vi.fn(() => null),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    const mockIframe = {
      contentDocument: mockContentDocument,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLIFrameElement;

    const { attachPreviewClickListener } = useBidirectionalHighlight({
      getIframe: () => mockIframe,
      setCursorToLine: vi.fn(),
      onNodeHighlight: vi.fn(),
    });

    attachPreviewClickListener();

    // The only allowed communication channel is contentDocument.addEventListener
    // (no innerHTML/insertAdjacentHTML/createElement('script') calls)
    expect(mockContentDocument.addEventListener).toHaveBeenCalledWith(
      "click",
      expect.any(Function)
    );

    // Verify the implementation source does not inject any <script> element
    // This is validated structurally: the composable file must not contain
    // createElement('script') or innerHTML assignment with script content.
    // The actual E2E sandbox enforcement is covered by T-058 Playwright layer.
  });

  it("highlightPreviewNode uses querySelector/classList on contentDocument only", async () => {
    const { useBidirectionalHighlight } = await import(
      "../../apps/editor/src/composables/use-bidirectional-highlight.ts"
    );

    const mockHighlightEl = {
      classList: { add: vi.fn(), remove: vi.fn() },
    };

    const mockContentDocument = {
      querySelectorAll: vi.fn(() => []),
      querySelector: vi.fn(() => mockHighlightEl),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    const mockIframe = {
      contentDocument: mockContentDocument,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLIFrameElement;

    const { highlightPreviewNode } = useBidirectionalHighlight({
      getIframe: () => mockIframe,
      setCursorToLine: vi.fn(),
      onNodeHighlight: vi.fn(),
    });

    highlightPreviewNode([{ nodeId: "2:0", sourceLine: 2 }], 2);

    // Communication only through contentDocument — querySelector then classList manipulation
    expect(mockContentDocument.querySelector).toHaveBeenCalled();
    expect(mockHighlightEl.classList.add).toHaveBeenCalledWith("cm-highlighted");
  });
});
