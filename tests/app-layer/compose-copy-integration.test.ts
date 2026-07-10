import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../apps/editor/src/use-cases/render.ts", () => ({
  composeRender: vi.fn(),
}));

import { composeCopy } from "../../apps/editor/src/use-cases/copy.ts";
import { composeRender } from "../../apps/editor/src/use-cases/render.ts";

const mockComposeRender = vi.mocked(composeRender);

// render() applies the output ruleset, so its html is already paste-safe:
// <style> blocks and var(--) are resolved/stripped before composeCopy sees it.
const PASTE_SAFE_HTML =
  '<section style="color:#333"><h1 style="font-size:24px">Hello</h1></section>';

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
    html: PASTE_SAFE_HTML,
    diagnostics: [],
    coreVersion: "0.0.0",
    themeVersion: "0.0.0",
    rulesetVersion: "0.0.0",
    report: emptyReport,
    versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
    nodeLocations: [],
  });
});

// ─────────────────────────────────────────────────────────────
// AC-002: composeCopy forwards the paste-safe render output verbatim to the clipboard
// ─────────────────────────────────────────────────────────────
describe("AC-002: composeCopy forwards render output to the clipboard text/html blob", () => {
  it("text/html ClipboardItem blob equals the render html and has no <style> tags", async () => {
    await composeCopy({ markdown: "# Hello", themeId: "default" });

    const htmlItem = capturedItems.find((i) => i.types.includes("text/html"));
    if (!htmlItem) throw new Error("text/html ClipboardItem not found");
    const blob = await htmlItem.getType("text/html");
    const text = await blob.text();
    expect(text).toBe(PASTE_SAFE_HTML);
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
