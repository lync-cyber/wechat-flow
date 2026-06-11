import { describe, expect, it, vi } from "vitest";

// ============================================================
// T-094 Wiring tests: end-to-end pipeline connections
// ============================================================
// These tests verify the wiring contract between components.
// Real iframe sandbox + real click-through is covered by T-058 Playwright E2E layer.

// ============================================================
// Step 1: renderMarkdown pipeline — injectNodeIds option
// ============================================================

describe("renderMarkdown with injectNodeIds=true produces data-node-id attributes", () => {
  // 首个用例承担整条 render 管线的首次动态 import，高并发下冷启动可超默认 5s
  it("html contains data-node-id attributes when injectNodeIds=true", async () => {
    const { renderMarkdown } = await import("../../packages/core/src/render.ts");
    const result = await renderMarkdown("# Hello\n\nWorld paragraph", { injectNodeIds: true });
    expect(result.html).toMatch(/data-node-id="/);
  }, 15000);

  it("html does NOT contain data-node-id attributes when injectNodeIds is omitted (default false)", async () => {
    const { renderMarkdown } = await import("../../packages/core/src/render.ts");
    const result = await renderMarkdown("# Hello\n\nWorld paragraph");
    expect(result.html).not.toMatch(/data-node-id="/);
  });

  it("html does NOT contain data-node-id attributes when injectNodeIds=false", async () => {
    const { renderMarkdown } = await import("../../packages/core/src/render.ts");
    const result = await renderMarkdown("# Hello\n\nWorld paragraph", { injectNodeIds: false });
    expect(result.html).not.toMatch(/data-node-id="/);
  });

  it("data-node-id format is '{sourceLine}:{nodeIndex}' with correct sourceLine from real mdast position", async () => {
    const { renderMarkdown } = await import("../../packages/core/src/render.ts");
    const result = await renderMarkdown("# Hello\n\nWorld paragraph", { injectNodeIds: true });
    // h1 is on line 1, p is on line 3
    expect(result.html).toMatch(/data-node-id="1:\d+"/);
    expect(result.html).toMatch(/data-node-id="3:\d+"/);
  });
});

// ============================================================
// Step 1: composeRender — injectNodeIds option pass-through
// ============================================================

describe("composeRender with injectNodeIds=true produces data-node-id in html", () => {
  it("html contains data-node-id when injectNodeIds=true", async () => {
    const { composeRender } = await import("../../apps/editor/src/use-cases/render.ts");
    const result = await composeRender({ markdown: "# Title\n\nBody", injectNodeIds: true });
    expect(result.html).toMatch(/data-node-id="/);
  });

  it("html does NOT contain data-node-id when injectNodeIds is not passed", async () => {
    const { composeRender } = await import("../../apps/editor/src/use-cases/render.ts");
    const result = await composeRender({ markdown: "# Title\n\nBody" });
    expect(result.html).not.toMatch(/data-node-id="/);
  });

  it("nodeLocations array is populated when injectNodeIds=true", async () => {
    const { composeRender } = await import("../../apps/editor/src/use-cases/render.ts");
    const result = await composeRender({ markdown: "# Title\n\nBody", injectNodeIds: true });
    expect(Array.isArray(result.nodeLocations)).toBe(true);
    expect(result.nodeLocations.length).toBeGreaterThan(0);
  });

  it("nodeLocations entries have nodeId and sourceLine fields", async () => {
    const { composeRender } = await import("../../apps/editor/src/use-cases/render.ts");
    const result = await composeRender({ markdown: "# Title\n\nBody", injectNodeIds: true });
    for (const loc of result.nodeLocations) {
      expect(typeof loc.nodeId).toBe("string");
      expect(typeof loc.sourceLine).toBe("number");
      expect(loc.nodeId).toMatch(/^\d+:\d+$/);
    }
  });

  it("nodeLocations is empty array when injectNodeIds is not passed", async () => {
    const { composeRender } = await import("../../apps/editor/src/use-cases/render.ts");
    const result = await composeRender({ markdown: "# Title\n\nBody" });
    expect(Array.isArray(result.nodeLocations)).toBe(true);
    expect(result.nodeLocations.length).toBe(0);
  });
});

// ============================================================
// Step 2: use-bidirectional-highlight wiring integration
// — These tests verify the composable correctly integrates
//   with real EditorView-like dispatch and iframe mock.
// Real iframe sandbox enforcement is covered by T-058 Playwright E2E.
// ============================================================

describe("useBidirectionalHighlight: detachPreviewClickListener cleans up handler", () => {
  it("removeEventListener is called on detach with the same handler as attach", async () => {
    const { useBidirectionalHighlight } = await import(
      "../../apps/editor/src/composables/use-bidirectional-highlight.ts"
    );

    const mockContentDocument = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      querySelector: vi.fn(() => null),
    };
    const mockIframe = {
      contentDocument: mockContentDocument,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLIFrameElement;

    const { attachPreviewClickListener, detachPreviewClickListener } = useBidirectionalHighlight({
      getIframe: () => mockIframe,
      setCursorToLine: vi.fn(),
      onNodeHighlight: vi.fn(),
    });

    attachPreviewClickListener();
    const addedHandler = mockContentDocument.addEventListener.mock.calls[0][1];

    detachPreviewClickListener();
    expect(mockContentDocument.removeEventListener).toHaveBeenCalledWith("click", addedHandler);
  });
});

describe("useBidirectionalHighlight: onNodeHighlight callback fires on preview click", () => {
  it("onNodeHighlight is called with the nodeId when preview element is clicked", async () => {
    const { useBidirectionalHighlight } = await import(
      "../../apps/editor/src/composables/use-bidirectional-highlight.ts"
    );

    const mockElement = {
      getAttribute: vi.fn((attr: string) => (attr === "data-node-id" ? "3:1" : null)),
      classList: { add: vi.fn(), remove: vi.fn() },
    };

    const mockContentDocument = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      querySelector: vi.fn(() => mockElement),
    };
    const mockIframe = {
      contentDocument: mockContentDocument,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLIFrameElement;

    const onNodeHighlight = vi.fn();
    const { attachPreviewClickListener } = useBidirectionalHighlight({
      getIframe: () => mockIframe,
      setCursorToLine: vi.fn(),
      onNodeHighlight,
    });

    attachPreviewClickListener();

    const clickHandler = mockContentDocument.addEventListener.mock.calls[0][1];
    const mockTarget = { closest: vi.fn(() => mockElement) };
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    clickHandler({ target: mockTarget } as any);

    expect(onNodeHighlight).toHaveBeenCalledWith("3:1");
  });
});

// ============================================================
// R-002: after srcdoc change (iframe reload), click listener must still fire
// The load event on the iframe re-attaches the click handler to the new contentDocument.
// Happy-dom constraint: we test the re-attach behavior contract (listener bound to new doc)
// rather than actual srcdoc reload; real sandbox behavior covered by T-058 Playwright E2E.
// ============================================================

describe("useBidirectionalHighlight: click listener re-attached after iframe reload (srcdoc update)", () => {
  it("after simulated iframe reload, click on data-node-id element still triggers setCursorToLine", async () => {
    const { useBidirectionalHighlight } = await import(
      "../../apps/editor/src/composables/use-bidirectional-highlight.ts"
    );

    const mockElement = {
      getAttribute: vi.fn((attr: string) => (attr === "data-node-id" ? "7:2" : null)),
      classList: { add: vi.fn(), remove: vi.fn() },
    };

    // First document (before reload)
    const firstDoc = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      querySelector: vi.fn(() => null),
    };

    // Second document (after reload — simulates srcdoc update creating a new contentDocument)
    const secondDoc = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      querySelector: vi.fn(() => null),
    };

    let currentDoc = firstDoc;
    const mockIframe = {
      get contentDocument() {
        return currentDoc;
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLIFrameElement;

    const setCursorToLine = vi.fn();
    const { attachPreviewClickListener, onIframeLoad } = useBidirectionalHighlight({
      getIframe: () => mockIframe,
      setCursorToLine,
      onNodeHighlight: vi.fn(),
    });

    // Initial attach
    attachPreviewClickListener();
    expect(firstDoc.addEventListener).toHaveBeenCalledWith("click", expect.any(Function));

    // Simulate srcdoc update → iframe fires load → switch to secondDoc
    currentDoc = secondDoc;
    onIframeLoad();

    // Listener must now be on secondDoc, not firstDoc
    expect(secondDoc.addEventListener).toHaveBeenCalledWith("click", expect.any(Function));

    // Click on secondDoc triggers setCursorToLine
    const clickHandler = secondDoc.addEventListener.mock.calls[0][1];
    const mockTarget = { closest: vi.fn(() => mockElement) };
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    clickHandler({ target: mockTarget } as any);

    expect(setCursorToLine).toHaveBeenCalledWith(7);
  });

  it("iframe load event handler is registered on getIframe() element", async () => {
    const { useBidirectionalHighlight } = await import(
      "../../apps/editor/src/composables/use-bidirectional-highlight.ts"
    );

    const mockContentDocument = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      querySelector: vi.fn(() => null),
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

    // The composable must register a 'load' listener on the iframe element itself
    // so that each srcdoc reload re-binds the click handler on the new contentDocument.
    expect(mockIframe.addEventListener).toHaveBeenCalledWith("load", expect.any(Function));
  });

  it("detach removes load listener from iframe element and click listener from current contentDocument", async () => {
    const { useBidirectionalHighlight } = await import(
      "../../apps/editor/src/composables/use-bidirectional-highlight.ts"
    );

    const mockContentDocument = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      querySelector: vi.fn(() => null),
    };
    const iframeAddEventListener = vi.fn();
    const iframeRemoveEventListener = vi.fn();
    const mockIframe = {
      contentDocument: mockContentDocument,
      addEventListener: iframeAddEventListener,
      removeEventListener: iframeRemoveEventListener,
    } as unknown as HTMLIFrameElement;

    const { attachPreviewClickListener, detachPreviewClickListener } = useBidirectionalHighlight({
      getIframe: () => mockIframe,
      setCursorToLine: vi.fn(),
      onNodeHighlight: vi.fn(),
    });

    attachPreviewClickListener();
    const loadHandler = iframeAddEventListener.mock.calls[0][1];

    detachPreviewClickListener();
    expect(iframeRemoveEventListener).toHaveBeenCalledWith("load", loadHandler);
    expect(mockContentDocument.removeEventListener).toHaveBeenCalledWith(
      "click",
      expect.any(Function)
    );
  });
});

// ============================================================
// Step 2: node-id-injector reads from hast node.position (standard)
// ============================================================

describe("node-id-injector reads sourceLine from node.position (standard hast format)", () => {
  it("reads sourceLine from node.position.start.line (hast standard)", async () => {
    const { injectNodeIds } = await import("../../packages/core/src/pipeline/node-id-injector.ts");
    const input = {
      type: "root" as const,
      children: [
        {
          type: "element" as const,
          tagName: "p",
          properties: {},
          children: [],
          // hast standard position field (no 'data' wrapper)
          position: { start: { line: 7, column: 1 }, end: { line: 7, column: 10 } },
        },
      ],
    };
    // biome-ignore lint/suspicious/noExplicitAny: test hast shape
    const result = injectNodeIds(input as any);
    // biome-ignore lint/suspicious/noExplicitAny: test hast shape
    const p = (result as any).children[0];
    expect(p.properties["data-node-id"]).toBe("7:0");
  });
});
