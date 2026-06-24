import { beforeEach, describe, expect, it, vi } from "vitest";

// Only mock composeRender; simulatePaste runs with its real implementation.
vi.mock("../../apps/editor/src/use-cases/render.ts", () => ({
  composeRender: vi.fn(),
}));

import { composeCopy } from "../../apps/editor/src/use-cases/copy.ts";
import { composeRender } from "../../apps/editor/src/use-cases/render.ts";

const mockComposeRender = vi.mocked(composeRender);

// Raw HTML that a real theme render might produce: contains a <style> block (stripped by simulatePaste)
// and inline styles with concrete values (CSS variables are resolved upstream by renderMarkdown, not here).
const RAW_HTML_WITH_STYLE_TAG =
  '<section style="color:#333"><h1 style="font-size:24px">Hello</h1><style>.cls{color:red}</style></section>';

const emptyReport = {
  diagnostics: [],
  nodeChangeRecords: [],
  nightRiskIssues: [],
  versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
};

type ClipboardRecord = Record<string, Blob | Promise<Blob>>;

class StubClipboardItem {
  types: string[];
  #record: ClipboardRecord;
  constructor(record: ClipboardRecord) {
    this.types = Object.keys(record);
    this.#record = record;
  }
  getType(type: string): Promise<Blob> {
    const v = this.#record[type];
    return v instanceof Blob ? Promise.resolve(v) : v;
  }
}

let capturedItems: StubClipboardItem[] = [];
let clipboardWriteStub: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  capturedItems = [];

  (globalThis as Record<string, unknown>).ClipboardItem = class extends StubClipboardItem {
    constructor(record: ClipboardRecord) {
      super(record);
      capturedItems.push(this);
    }
  };

  clipboardWriteStub = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(globalThis, "navigator", {
    value: { clipboard: { write: clipboardWriteStub } },
    writable: true,
    configurable: true,
  });

  mockComposeRender.mockResolvedValue({
    html: RAW_HTML_WITH_STYLE_TAG,
    diagnostics: [],
    postPaste: false,
    coreVersion: "0.0.0",
    themeVersion: "0.0.0",
    rulesetVersion: "0.0.0",
    report: emptyReport,
    versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
    nodeLocations: [],
  });
});

// ─────────────────────────────────────────────────────────────
// AC-002 integration: real simulatePaste strips <style> and var(-- from raw render output
// ─────────────────────────────────────────────────────────────
describe("AC-002 integration: real simulatePaste strips <style> blocks from raw render output", () => {
  it("text/html ClipboardItem blob has no <style> tags after real simulatePaste", async () => {
    // simulatePaste strips <style> elements from raw render HTML regardless of their content.
    await composeCopy({ markdown: "# Hello", themeId: "default" });

    const htmlItem = capturedItems.find((i) => i.types.includes("text/html"));
    if (!htmlItem) throw new Error("text/html ClipboardItem not found");
    const blob = await htmlItem.getType("text/html");
    const text = await blob.text();
    expect(text).not.toMatch(/<style[\s>]/i);
  });

  it("clipboard.write failure triggers error notification", async () => {
    clipboardWriteStub.mockRejectedValue(new DOMException("Permission denied", "NotAllowedError"));
    const notify = vi.fn();

    await composeCopy({ markdown: "# Hello", themeId: "default", notify });

    expect(notify).toHaveBeenCalledWith({ type: "error", message: "复制失败" });
  });
});

// ─────────────────────────────────────────────────────────────
// SR-A-002: onCopyHtml notify wires to toast queue via useToast.pushToast
// ─────────────────────────────────────────────────────────────
describe("SR-A-002: useToast pushToast receives success notification after composeCopy", () => {
  it("pushToast is called with type:success and message after successful copy", async () => {
    const { useToast } = await import("../../apps/editor/src/composables/use-toast.ts");
    const { pushToast, toasts } = useToast();

    const initialLength = toasts.value.length;

    clipboardWriteStub.mockResolvedValue(undefined);
    await composeCopy({ markdown: "# Hello", themeId: "default", notify: pushToast });

    expect(toasts.value.length).toBe(initialLength + 1);
    const added = toasts.value[toasts.value.length - 1];
    expect(added.type).toBe("success");
    expect(added.message).toBe("已复制到剪贴板");
  });
});
