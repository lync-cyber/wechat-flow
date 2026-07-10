import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks (hoisted above imports by vitest) ---

vi.mock("../../apps/editor/src/use-cases/render.ts", () => ({
  composeRender: vi.fn(),
}));

import { composeCopy } from "../../apps/editor/src/use-cases/copy.ts";
import { composeRender } from "../../apps/editor/src/use-cases/render.ts";

const mockComposeRender = vi.mocked(composeRender);

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

// composeRender output is already paste-safe (output ruleset strips <style>/var(--)
// at render time); composeCopy forwards it to the clipboard verbatim.
const SAMPLE_HTML = '<section style="color:#333"><h1 style="font-size:24px">Hello</h1></section>';

const emptyReport = {
  diagnostics: [],
  nodeChangeRecords: [],
  nightRiskIssues: [],
  versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
};

function renderResult(html: string) {
  return {
    html,
    diagnostics: [],
    coreVersion: "0.0.0",
    themeVersion: "0.0.0",
    rulesetVersion: "0.0.0",
    report: emptyReport,
    versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
    nodeLocations: [],
  };
}

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

  mockComposeRender.mockResolvedValue(renderResult(SAMPLE_HTML));
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
  it("composeCopy ClipboardItem text/html blob content has no <style> tags", async () => {
    await composeCopy({ markdown: "# Hello", themeId: "default" });

    const htmlItem = capturedItems.find((i) => i.types.includes("text/html"));
    if (!htmlItem) throw new Error("text/html ClipboardItem not found");
    const blob = await htmlItem.getType("text/html");
    const text = await blob.text();
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
// AC-005: pipeline 顺序 composeRender → clipboard.write
// ─────────────────────────────────────────────────────────────
describe("AC-005: pipeline order: composeRender → clipboard.write", () => {
  it("composeRender is called before clipboard.write", async () => {
    const callOrder: string[] = [];

    mockComposeRender.mockImplementation(async () => {
      callOrder.push("composeRender");
      return renderResult(SAMPLE_HTML);
    });

    clipboardWriteStub.mockImplementation(async () => {
      callOrder.push("clipboard.write");
    });

    await composeCopy({ markdown: "# Hello", themeId: "default" });

    const renderIdx = callOrder.indexOf("composeRender");
    const writeIdx = callOrder.indexOf("clipboard.write");
    expect(renderIdx).toBeGreaterThanOrEqual(0);
    expect(writeIdx).toBeGreaterThan(renderIdx);
  });

  it("buildDualMimePayload uses the render html as text/html source", async () => {
    await composeCopy({ markdown: "# Hello", themeId: "default" });

    const htmlItem = capturedItems.find((i) => i.types.includes("text/html"));
    if (!htmlItem) throw new Error("text/html ClipboardItem not found");
    const blob = await htmlItem.getType("text/html");
    const text = await blob.text();
    expect(text).toBe(SAMPLE_HTML);
  });
});
