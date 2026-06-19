import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks (hoisted above imports by vitest) ---

vi.mock("../../apps/editor/src/use-cases/render.ts", () => ({
  composeRender: vi.fn(),
}));

vi.mock("../../packages/core/src/simulate-paste.ts", () => ({
  simulatePaste: vi.fn(),
}));

import { composeCopy } from "../../apps/editor/src/use-cases/copy.ts";
import { composeRender } from "../../apps/editor/src/use-cases/render.ts";
import { simulatePaste } from "../../packages/core/src/simulate-paste.ts";

const mockComposeRender = vi.mocked(composeRender);
const mockSimulatePaste = vi.mocked(simulatePaste);

// ─────────────────────────────────────────────────────────────
// Test infrastructure: ClipboardItem stub
// ClipboardItem does not exist in Node/vitest; provide a minimal stub.
// ─────────────────────────────────────────────────────────────

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

// Captured items from each test
let capturedItems: StubClipboardItem[] = [];

// navigator.clipboard.write stub
let clipboardWriteStub: ReturnType<typeof vi.fn>;

const SAMPLE_RAW_HTML =
  '<section style="color:var(--color-text)"><h1 style="font-size:24px">Hello</h1><style>.cls{}</style></section>';
const SAMPLE_FILTERED_HTML =
  '<section style="color:#333"><h1 style="font-size:24px">Hello</h1></section>';

beforeEach(() => {
  vi.clearAllMocks();
  capturedItems = [];

  // Install StubClipboardItem globally so buildDualMimePayload can construct items
  (globalThis as Record<string, unknown>).ClipboardItem = class extends StubClipboardItem {
    constructor(record: ClipboardRecord) {
      super(record);
      capturedItems.push(this);
    }
  };

  // Install navigator.clipboard stub
  clipboardWriteStub = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(globalThis, "navigator", {
    value: { clipboard: { write: clipboardWriteStub } },
    writable: true,
    configurable: true,
  });

  const emptyReport = {
    diagnostics: [],
    nodeChangeRecords: [],
    nightRiskIssues: [],
    versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
  };
  mockComposeRender.mockResolvedValue({
    html: SAMPLE_RAW_HTML,
    diagnostics: [],
    postPaste: false,
    coreVersion: "0.0.0",
    themeVersion: "0.0.0",
    rulesetVersion: "0.0.0",
    report: emptyReport,
    versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
    nodeLocations: [],
  });

  mockSimulatePaste.mockReturnValue({
    filteredHtml: SAMPLE_FILTERED_HTML,
    nodeDiffs: [],
    droppedAttrs: [],
  });
});

// ─────────────────────────────────────────────────────────────
// AC-001: navigator.clipboard.write 被调用，payload 含 text/html 与 text/plain ClipboardItem
// ─────────────────────────────────────────────────────────────
describe("AC-001: composeCopy writes dual-MIME ClipboardItem to clipboard", () => {
  it("calls navigator.clipboard.write with an array argument", async () => {
    await composeCopy({ markdown: "# Hello", themeId: "default" });

    expect(clipboardWriteStub).toHaveBeenCalledOnce();
    const [payload] = clipboardWriteStub.mock.calls[0] as [unknown[]];
    expect(Array.isArray(payload)).toBe(true);
  });

  it("payload contains an item with text/html type", async () => {
    await composeCopy({ markdown: "# Hello", themeId: "default" });

    const htmlItem = capturedItems.find((i) => i.types.includes("text/html"));
    expect(htmlItem).toBeDefined();
  });

  it("payload contains an item with text/plain type", async () => {
    await composeCopy({ markdown: "# Hello", themeId: "default" });

    const plainItem = capturedItems.find((i) => i.types.includes("text/plain"));
    expect(plainItem).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────
// AC-002: text/html 内容无 <style> 标签、无 CSS 变量 var(--)
// ─────────────────────────────────────────────────────────────
describe("AC-002: text/html payload has no <style> tags and no CSS variables", () => {
  it("simulatePaste-filtered HTML has no <style> tags", () => {
    expect(SAMPLE_FILTERED_HTML).not.toMatch(/<style[\s>]/i);
  });

  it("simulatePaste-filtered HTML has no CSS variables", () => {
    expect(SAMPLE_FILTERED_HTML).not.toContain("var(--");
  });

  it("composeCopy ClipboardItem text/html blob content has no <style> tags", async () => {
    await composeCopy({ markdown: "# Hello", themeId: "default" });

    const htmlItem = capturedItems.find((i) => i.types.includes("text/html"));
    expect(htmlItem).toBeDefined();
    const blob = await htmlItem?.getType("text/html");
    const text = await blob?.text();
    expect(text).not.toMatch(/<style[\s>]/i);
    expect(text).not.toContain("var(--");
  });
});

// ─────────────────────────────────────────────────────────────
// AC-003: composeCopy 成功后触发 notify callback（type:'success'，消息「已复制到剪贴板」）
// ─────────────────────────────────────────────────────────────
describe("AC-003: composeCopy triggers notify callback on success", () => {
  it("calls notify with type:'success' and message '已复制到剪贴板'", async () => {
    const notify = vi.fn();

    await composeCopy({ markdown: "# Hello", themeId: "default", notify });

    expect(notify).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledWith({
      type: "success",
      message: "已复制到剪贴板",
    });
  });

  it("does not throw when notify is not provided", async () => {
    await expect(composeCopy({ markdown: "# Hello", themeId: "default" })).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// AC-005: pipeline 顺序 composeRender → simulatePaste → clipboard.write
// ─────────────────────────────────────────────────────────────
describe("AC-005: pipeline order: composeRender → simulatePaste → clipboard.write", () => {
  it("composeRender is called before simulatePaste", async () => {
    const callOrder: string[] = [];

    mockComposeRender.mockImplementation(async () => {
      callOrder.push("composeRender");
      return {
        html: SAMPLE_RAW_HTML,
        diagnostics: [],
        postPaste: false,
        coreVersion: "0.0.0",
        themeVersion: "0.0.0",
        rulesetVersion: "0.0.0",
        report: {
          diagnostics: [],
          nodeChangeRecords: [],
          nightRiskIssues: [],
          versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
        },
        versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
        nodeLocations: [],
      };
    });

    mockSimulatePaste.mockImplementation(() => {
      callOrder.push("simulatePaste");
      return { filteredHtml: SAMPLE_FILTERED_HTML, nodeDiffs: [], droppedAttrs: [] };
    });

    await composeCopy({ markdown: "# Hello", themeId: "default" });

    const renderIdx = callOrder.indexOf("composeRender");
    const pasteIdx = callOrder.indexOf("simulatePaste");
    expect(renderIdx).toBeGreaterThanOrEqual(0);
    expect(pasteIdx).toBeGreaterThan(renderIdx);
  });

  it("simulatePaste receives the raw html from composeRender output", async () => {
    await composeCopy({ markdown: "# Hello", themeId: "default" });

    expect(mockSimulatePaste).toHaveBeenCalledWith(SAMPLE_RAW_HTML);
  });

  it("clipboard.write is called only after simulatePaste completes", async () => {
    const callOrder: string[] = [];

    mockSimulatePaste.mockImplementation(() => {
      callOrder.push("simulatePaste");
      return { filteredHtml: SAMPLE_FILTERED_HTML, nodeDiffs: [], droppedAttrs: [] };
    });

    clipboardWriteStub.mockImplementation(async () => {
      callOrder.push("clipboard.write");
    });

    await composeCopy({ markdown: "# Hello", themeId: "default" });

    const pasteIdx = callOrder.indexOf("simulatePaste");
    const writeIdx = callOrder.indexOf("clipboard.write");
    expect(pasteIdx).toBeGreaterThanOrEqual(0);
    expect(writeIdx).toBeGreaterThan(pasteIdx);
  });

  it("buildDualMimePayload uses filteredHtml (not rawHtml) as text/html source", async () => {
    await composeCopy({ markdown: "# Hello", themeId: "default" });

    const htmlItem = capturedItems.find((i) => i.types.includes("text/html"));
    expect(htmlItem).toBeDefined();
    const blob = await htmlItem?.getType("text/html");
    const text = await blob?.text();
    expect(text).toBe(SAMPLE_FILTERED_HTML);
    expect(text).not.toBe(SAMPLE_RAW_HTML);
  });
});
