// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

// ============================================================
// T-115 Directive Autocomplete — RED phase
// ============================================================
// Tests cover:
//   AC-001: trigger detection, candidate generation, snippet generation, popover rendering
//   AC-002: Escape key closes popover
//   AC-003: production-path wiring — registerDirectiveCompletion in SourcePane.vue

// Side-effect import to populate block/mark registries
import "../../packages/blocks/src/index.ts";
import "../../packages/marks/src/index.ts";

// Deferred module path — prevents Vite static-analysis from failing at transform time
// when the implementation file does not yet exist (RED phase).
// At runtime the import throws "module not found", which the test catches correctly.
const COMPLETION_MODULE = [
  "../../apps/editor/src/editor/extensions/",
  "directive-completion.ts",
].join("");
const POPOVER_MODULE = [
  "../../apps/editor/src/components/editor/",
  "DirectiveAutocompletePopover.vue",
].join("");

// ============================================================
// AC-001: Trigger detection — cursor text → {triggerType, query} or null
// ============================================================

describe("AC-001: detectDirectiveTrigger — cursor prefix → trigger info", () => {
  it("returns block trigger when cursor prefix is exactly ':::'", async () => {
    const { detectDirectiveTrigger } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    const result = detectDirectiveTrigger(":::");
    expect(result).not.toBeNull();
    const r =
      result ??
      (() => {
        throw new Error("expected non-null trigger result");
      })();
    expect(r.triggerType).toBe("block");
    expect(r.query).toBe("");
  });

  it("returns block trigger with query when prefix is ':::card'", async () => {
    const { detectDirectiveTrigger } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    const result = detectDirectiveTrigger(":::card");
    expect(result).not.toBeNull();
    const r =
      result ??
      (() => {
        throw new Error("expected non-null trigger result");
      })();
    expect(r.triggerType).toBe("block");
    expect(r.query).toBe("card");
  });

  it("returns inline trigger when prefix is ':b' (colon + one alphanumeric char)", async () => {
    const { detectDirectiveTrigger } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    const result = detectDirectiveTrigger(":b");
    expect(result).not.toBeNull();
    const r =
      result ??
      (() => {
        throw new Error("expected non-null trigger result");
      })();
    expect(r.triggerType).toBe("inline");
    expect(r.query).toBe("b");
  });

  it("returns inline trigger with multi-char query ':bold'", async () => {
    const { detectDirectiveTrigger } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    const result = detectDirectiveTrigger(":bold");
    expect(result).not.toBeNull();
    const r =
      result ??
      (() => {
        throw new Error("expected non-null trigger result");
      })();
    expect(r.triggerType).toBe("inline");
    expect(r.query).toBe("bold");
  });

  it("returns null when prefix is single ':' (no follow-up alphanumeric char)", async () => {
    const { detectDirectiveTrigger } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    expect(detectDirectiveTrigger(":")).toBeNull();
  });

  it("returns null when prefix contains a space after ':'", async () => {
    const { detectDirectiveTrigger } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    expect(detectDirectiveTrigger(": foo")).toBeNull();
  });

  it("returns null when prefix contains Chinese character after ':'", async () => {
    const { detectDirectiveTrigger } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    expect(detectDirectiveTrigger(":中")).toBeNull();
  });

  it("returns null for plain text with no trigger prefix", async () => {
    const { detectDirectiveTrigger } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    expect(detectDirectiveTrigger("hello world")).toBeNull();
  });

  it("returns null for empty string", async () => {
    const { detectDirectiveTrigger } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    expect(detectDirectiveTrigger("")).toBeNull();
  });
});

// ============================================================
// AC-001: Candidate generation — query → candidate list from registry
// ============================================================

describe("AC-001: buildCandidates — query filters blocks and marks from registry", () => {
  it("returns block candidates matching query 'ca' (card, callout)", async () => {
    const { buildCandidates } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    const { listBlocks } = await import("../../packages/core/src/registry/block.ts");
    const { listMarks } = await import("../../packages/core/src/registry/mark.ts");
    const candidates = buildCandidates("block", "ca", listBlocks(), listMarks());
    const ids = candidates.map((c) => c.id);
    expect(ids).toContain("card");
    expect(ids).toContain("callout");
    const allMarks = listMarks();
    for (const id of ids) {
      const isMarkId = allMarks.some((m) => m.id === id);
      expect(isMarkId).toBe(false);
    }
  });

  it("returns inline candidates matching query 'bo' (bold)", async () => {
    const { buildCandidates } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    const { listBlocks } = await import("../../packages/core/src/registry/block.ts");
    const { listMarks } = await import("../../packages/core/src/registry/mark.ts");
    const candidates = buildCandidates("inline", "bo", listBlocks(), listMarks());
    const ids = candidates.map((c) => c.id);
    expect(ids).toContain("bold");
    const allBlocks = listBlocks();
    for (const id of ids) {
      const isBlockId = allBlocks.some((b) => b.id === id);
      expect(isBlockId).toBe(false);
    }
  });

  it("returns all 25 blocks when query is empty string (block trigger)", async () => {
    const { buildCandidates } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    const { listBlocks } = await import("../../packages/core/src/registry/block.ts");
    const { listMarks } = await import("../../packages/core/src/registry/mark.ts");
    const candidates = buildCandidates("block", "", listBlocks(), listMarks());
    expect(candidates.length).toBe(listBlocks().length);
  });

  it("returns all 12 marks when query is empty string (inline trigger)", async () => {
    const { buildCandidates } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    const { listBlocks } = await import("../../packages/core/src/registry/block.ts");
    const { listMarks } = await import("../../packages/core/src/registry/mark.ts");
    const candidates = buildCandidates("inline", "", listBlocks(), listMarks());
    expect(candidates.length).toBe(listMarks().length);
  });

  it("returns empty array when query matches nothing", async () => {
    const { buildCandidates } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    const { listBlocks } = await import("../../packages/core/src/registry/block.ts");
    const { listMarks } = await import("../../packages/core/src/registry/mark.ts");
    const candidates = buildCandidates("block", "zzznomatch", listBlocks(), listMarks());
    expect(candidates.length).toBe(0);
  });

  it("each candidate has id, name, and type fields with non-empty string values", async () => {
    const { buildCandidates } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    const { listBlocks } = await import("../../packages/core/src/registry/block.ts");
    const { listMarks } = await import("../../packages/core/src/registry/mark.ts");
    const candidates = buildCandidates("block", "card", listBlocks(), listMarks());
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      expect(typeof c.id).toBe("string");
      expect(c.id.length).toBeGreaterThan(0);
      expect(typeof c.name).toBe("string");
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.type === "block" || c.type === "inline").toBe(true);
    }
  });
});

// ============================================================
// AC-001: Snippet generation — selection → directive string
// ============================================================

describe("AC-001: buildDirectiveSnippet — selection produces directive syntax string", () => {
  it("block snippet for 'card' with no variantId starts with ':::card'", async () => {
    const { buildDirectiveSnippet } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    const snippet = buildDirectiveSnippet({ type: "block", blockId: "card" });
    expect(snippet).toMatch(/^:::card/);
  });

  it("block snippet for 'card' with variantId 'elevated' contains 'card' and ':::'", async () => {
    const { buildDirectiveSnippet } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    const snippet = buildDirectiveSnippet({
      type: "block",
      blockId: "card",
      variantId: "elevated",
    });
    expect(snippet).toContain("card");
    expect(snippet).toContain(":::");
  });

  it("inline snippet for 'bold' starts with ':bold['", async () => {
    const { buildDirectiveSnippet } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    const snippet = buildDirectiveSnippet({ type: "inline", blockId: "bold" });
    expect(snippet).toMatch(/^:bold\[/);
  });

  it("inline snippet for 'badge' starts with ':badge['", async () => {
    const { buildDirectiveSnippet } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    const snippet = buildDirectiveSnippet({ type: "inline", blockId: "badge" });
    expect(snippet).toMatch(/^:badge\[/);
  });

  it("block snippet with params encodes key=val inside braces '{}'", async () => {
    const { buildDirectiveSnippet } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    const snippet = buildDirectiveSnippet({
      type: "block",
      blockId: "callout",
      params: { type: "info" },
    });
    expect(snippet).toContain("{");
    expect(snippet).toContain("type=info");
    expect(snippet).toContain("}");
  });

  it("inline snippet with params encodes key=val inside braces '{}'", async () => {
    const { buildDirectiveSnippet } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    const snippet = buildDirectiveSnippet({
      type: "inline",
      blockId: "badge",
      params: { color: "red" },
    });
    expect(snippet).toContain("{");
    expect(snippet).toContain("color=red");
    expect(snippet).toContain("}");
  });
});

// ============================================================
// AC-001: DirectiveAutocompletePopover component — props drive rendering
// ============================================================

describe("AC-001: DirectiveAutocompletePopover — renders candidates from props", () => {
  it("renders a list item for each block in the blocks prop when isOpen=true", async () => {
    const { mount } = await import("@vue/test-utils");
    const { default: DirectiveAutocompletePopover } = (await import(
      /* @vite-ignore */ POPOVER_MODULE
    )) as typeof import("../../apps/editor/src/components/editor/DirectiveAutocompletePopover.vue");
    const { listBlocks } = await import("../../packages/core/src/registry/block.ts");
    const { listMarks } = await import("../../packages/core/src/registry/mark.ts");
    const blocks = listBlocks().slice(0, 3);
    const wrapper = mount(DirectiveAutocompletePopover, {
      props: {
        isOpen: true,
        triggerType: "block" as const,
        blocks,
        marks: listMarks(),
        currentInput: "",
        onSelect: () => {},
        onClose: () => {},
      },
    });
    const items = wrapper.findAll("[data-testid='autocomplete-item']");
    expect(items.length).toBe(3);
    expect(items[0].text()).toContain(blocks[0].name);
  });

  it("renders first item with active highlight when isOpen=true (open-empty default state)", async () => {
    const { mount } = await import("@vue/test-utils");
    const { default: DirectiveAutocompletePopover } = (await import(
      /* @vite-ignore */ POPOVER_MODULE
    )) as typeof import("../../apps/editor/src/components/editor/DirectiveAutocompletePopover.vue");
    const { listBlocks } = await import("../../packages/core/src/registry/block.ts");
    const { listMarks } = await import("../../packages/core/src/registry/mark.ts");
    const blocks = listBlocks().slice(0, 3);
    const wrapper = mount(DirectiveAutocompletePopover, {
      props: {
        isOpen: true,
        triggerType: "block" as const,
        blocks,
        marks: listMarks(),
        currentInput: "",
        onSelect: () => {},
        onClose: () => {},
      },
    });
    const firstItem = wrapper.find("[data-testid='autocomplete-item']");
    const isHighlighted =
      firstItem
        .classes()
        .some((c) => c.includes("active") || c.includes("highlight") || c.includes("selected")) ||
      firstItem.attributes("aria-selected") === "true";
    expect(isHighlighted).toBe(true);
  });

  it("renders zero list items when isOpen=false", async () => {
    const { mount } = await import("@vue/test-utils");
    const { default: DirectiveAutocompletePopover } = (await import(
      /* @vite-ignore */ POPOVER_MODULE
    )) as typeof import("../../apps/editor/src/components/editor/DirectiveAutocompletePopover.vue");
    const { listBlocks } = await import("../../packages/core/src/registry/block.ts");
    const { listMarks } = await import("../../packages/core/src/registry/mark.ts");
    const wrapper = mount(DirectiveAutocompletePopover, {
      props: {
        isOpen: false,
        triggerType: "block" as const,
        blocks: listBlocks(),
        marks: listMarks(),
        currentInput: "",
        onSelect: () => {},
        onClose: () => {},
      },
    });
    const items = wrapper.findAll("[data-testid='autocomplete-item']");
    expect(items.length).toBe(0);
  });

  it("filters displayed items by currentInput='card' (fewer than total blocks)", async () => {
    const { mount } = await import("@vue/test-utils");
    const { default: DirectiveAutocompletePopover } = (await import(
      /* @vite-ignore */ POPOVER_MODULE
    )) as typeof import("../../apps/editor/src/components/editor/DirectiveAutocompletePopover.vue");
    const { listBlocks } = await import("../../packages/core/src/registry/block.ts");
    const { listMarks } = await import("../../packages/core/src/registry/mark.ts");
    const wrapper = mount(DirectiveAutocompletePopover, {
      props: {
        isOpen: true,
        triggerType: "block" as const,
        blocks: listBlocks(),
        marks: listMarks(),
        currentInput: "card",
        onSelect: () => {},
        onClose: () => {},
      },
    });
    const items = wrapper.findAll("[data-testid='autocomplete-item']");
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThan(listBlocks().length);
    for (const item of items) {
      expect(item.text().toLowerCase()).toContain("card");
    }
  });

  it("calls onSelect with {type, blockId} payload when a list item is clicked", async () => {
    const { mount } = await import("@vue/test-utils");
    const { default: DirectiveAutocompletePopover } = (await import(
      /* @vite-ignore */ POPOVER_MODULE
    )) as typeof import("../../apps/editor/src/components/editor/DirectiveAutocompletePopover.vue");
    const { listBlocks } = await import("../../packages/core/src/registry/block.ts");
    const { listMarks } = await import("../../packages/core/src/registry/mark.ts");
    const blocks = listBlocks().slice(0, 2);
    const onSelect = vi.fn();
    const wrapper = mount(DirectiveAutocompletePopover, {
      props: {
        isOpen: true,
        triggerType: "block" as const,
        blocks,
        marks: listMarks(),
        currentInput: "",
        onSelect,
        onClose: () => {},
      },
    });
    const firstItem = wrapper.find("[data-testid='autocomplete-item']");
    await firstItem.trigger("click");
    expect(onSelect).toHaveBeenCalledOnce();
    const call = onSelect.mock.calls[0][0] as { type: string; blockId: string };
    expect(call.type === "block" || call.type === "inline").toBe(true);
    expect(typeof call.blockId).toBe("string");
    expect(call.blockId.length).toBeGreaterThan(0);
  });
});

// ============================================================
// AC-002: Escape key closes popover, focus not lost
// ============================================================

describe("AC-002: Escape key closes the DirectiveAutocompletePopover", () => {
  it("calls onClose when Escape key is pressed while popover is open", async () => {
    const { mount } = await import("@vue/test-utils");
    const { default: DirectiveAutocompletePopover } = (await import(
      /* @vite-ignore */ POPOVER_MODULE
    )) as typeof import("../../apps/editor/src/components/editor/DirectiveAutocompletePopover.vue");
    const { listBlocks } = await import("../../packages/core/src/registry/block.ts");
    const { listMarks } = await import("../../packages/core/src/registry/mark.ts");
    const onClose = vi.fn();
    const wrapper = mount(DirectiveAutocompletePopover, {
      props: {
        isOpen: true,
        triggerType: "block" as const,
        blocks: listBlocks(),
        marks: listMarks(),
        currentInput: "",
        onSelect: () => {},
        onClose,
      },
      attachTo: document.body,
    });
    await wrapper.trigger("keydown", { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does NOT call onClose when Enter or ArrowDown keys are pressed", async () => {
    const { mount } = await import("@vue/test-utils");
    const { default: DirectiveAutocompletePopover } = (await import(
      /* @vite-ignore */ POPOVER_MODULE
    )) as typeof import("../../apps/editor/src/components/editor/DirectiveAutocompletePopover.vue");
    const { listBlocks } = await import("../../packages/core/src/registry/block.ts");
    const { listMarks } = await import("../../packages/core/src/registry/mark.ts");
    const onClose = vi.fn();
    const wrapper = mount(DirectiveAutocompletePopover, {
      props: {
        isOpen: true,
        triggerType: "block" as const,
        blocks: listBlocks(),
        marks: listMarks(),
        currentInput: "",
        onSelect: () => {},
        onClose,
      },
      attachTo: document.body,
    });
    await wrapper.trigger("keydown", { key: "Enter" });
    await wrapper.trigger("keydown", { key: "ArrowDown" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("编辑器内按 Escape 关闭浮层后焦点归还编辑器（document.activeElement 回到 contentDOM）", async () => {
    const { registerDirectiveCompletion } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    const { EditorView } = await import("@codemirror/view");

    const onClose = vi.fn();
    const view = new EditorView({
      doc: ":::ca",
      extensions: [registerDirectiveCompletion({ onClose, onSelect: () => {} })],
      parent: document.body,
    });

    const focusStealer = document.createElement("button");
    document.body.appendChild(focusStealer);
    focusStealer.focus();
    expect(document.activeElement).toBe(focusStealer);

    view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(onClose).toHaveBeenCalled();
    expect(view.hasFocus || document.activeElement === view.contentDOM).toBe(true);

    view.destroy();
    focusStealer.remove();
  });

  it("registerDirectiveCompletion returns a truthy extension and accepts onClose callback", async () => {
    const { registerDirectiveCompletion } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    const onClose = vi.fn();
    const extension = registerDirectiveCompletion({ onClose, onSelect: () => {} });
    expect(extension).toBeTruthy();
    // onClose must not be invoked on construction — only on user Escape action
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ============================================================
// AC-003: Production path — registerDirectiveCompletion called in SourcePane.vue
// ============================================================

describe("AC-003: production-path wiring — SourcePane.vue contains registerDirectiveCompletion call", () => {
  it("SourcePane.vue source text contains 'registerDirectiveCompletion(' call", () => {
    const sourcePanePath = join(process.cwd(), "apps/editor/src/components/editor/SourcePane.vue");
    const source = readFileSync(sourcePanePath, "utf-8");
    expect(source).toContain("registerDirectiveCompletion(");
  });

  it("registerDirectiveCompletion export is callable and returns a truthy extension value", async () => {
    const { registerDirectiveCompletion } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    const result = registerDirectiveCompletion({ onClose: () => {}, onSelect: () => {} });
    expect(result).toBeTruthy();
  });

  it("extension 在文档出现 ':::ca' 前缀时调用 onTrigger，删除后调用 onClose", async () => {
    const { registerDirectiveCompletion } = (await import(
      /* @vite-ignore */ COMPLETION_MODULE
    )) as typeof import("../../apps/editor/src/editor/extensions/directive-completion.ts");
    const { EditorView } = await import("@codemirror/view");

    const onTrigger = vi.fn();
    const onClose = vi.fn();
    const view = new EditorView({
      doc: "",
      extensions: [registerDirectiveCompletion({ onClose, onSelect: () => {}, onTrigger })],
      parent: document.body,
    });

    view.dispatch({ changes: { from: 0, insert: ":::ca" }, selection: { anchor: 5 } });
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(onTrigger).toHaveBeenCalled();
    const context = onTrigger.mock.calls[onTrigger.mock.calls.length - 1][0];
    expect(context.triggerType).toBe("block");
    expect(context.query).toBe("ca");
    expect(context.from).toBe(0);
    expect(context.to).toBe(5);

    view.dispatch({ changes: { from: 0, to: 5, insert: "plain" }, selection: { anchor: 5 } });
    expect(onClose).toHaveBeenCalled();

    view.destroy();
  });

  it("module exports detectDirectiveTrigger, buildCandidates, buildDirectiveSnippet — all callable with valid args", async () => {
    const mod = (await import(/* @vite-ignore */ COMPLETION_MODULE)) as typeof import(
      "../../apps/editor/src/editor/extensions/directive-completion.ts"
    );
    const { listBlocks } = await import("../../packages/core/src/registry/block.ts");
    const { listMarks } = await import("../../packages/core/src/registry/mark.ts");

    const triggerResult = mod.detectDirectiveTrigger(":::");
    const tr =
      triggerResult ??
      (() => {
        throw new Error("expected non-null");
      })();
    expect(tr.triggerType).toBe("block");

    const candidates = mod.buildCandidates("block", "", listBlocks(), listMarks());
    expect(candidates.length).toBe(listBlocks().length);

    const snippet = mod.buildDirectiveSnippet({ type: "block", blockId: "card" });
    expect(snippet).toMatch(/^:::card/);
  });
});
