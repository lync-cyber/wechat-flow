import type { Element, Node } from "hast";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getRules } from "../../packages/ruleset/src/index.ts";
import {
  type DeclarativePatchEntry,
  compilePatchEntry,
  registerPatchTransform,
} from "../../packages/ruleset/src/patch-dsl.ts";
import {
  PatchLoadError,
  applyPatchBundle,
  loadPatchBundle,
} from "../../packages/ruleset/src/patch-loader.ts";

function el(
  tagName: string,
  properties: Element["properties"] = {},
  children: Element["children"] = []
): Element {
  return { type: "element", tagName, properties, children };
}

function makeEntry(overrides: Partial<DeclarativePatchEntry> = {}): DeclarativePatchEntry {
  return {
    id: `dsl-${Math.abs(hashOf(JSON.stringify(overrides)))}-${entrySeq++}`,
    scope: "strip",
    priority: 90,
    match: { type: "style-prop", props: ["gap"] },
    apply: { transform: "remove-css-declarations", params: { props: ["gap"] } },
    ...overrides,
  };
}

let entrySeq = 0;
function hashOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

// JSON round-trip guarantees the entry is exactly what a fetched bundle would carry.
function viaJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("compilePatchEntry: matcher DSL", () => {
  it("style-prop matcher matches an element carrying any listed CSS property", () => {
    const rule = compilePatchEntry(viaJson(makeEntry()));
    expect(rule.matcher(el("section", { style: "gap: 8px; color: red" }))).toBe(true);
    expect(rule.matcher(el("section", { style: "color: red" }))).toBe(false);
  });

  it("tag matcher matches listed tag names only", () => {
    const rule = compilePatchEntry(
      viaJson(
        makeEntry({
          match: { type: "tag", tags: ["iframe", "video"] },
          apply: { transform: "drop-node" },
        })
      )
    );
    expect(rule.matcher(el("iframe"))).toBe(true);
    expect(rule.matcher(el("video"))).toBe(true);
    expect(rule.matcher(el("p"))).toBe(false);
  });

  it("attr matcher matches elements carrying any listed attribute", () => {
    const rule = compilePatchEntry(
      viaJson(
        makeEntry({
          match: { type: "attr", attrs: ["data-track"] },
          apply: { transform: "remove-attributes", params: { attrs: ["data-track"] } },
        })
      )
    );
    expect(rule.matcher(el("span", { "data-track": "x" }))).toBe(true);
    expect(rule.matcher(el("span", { id: "a" }))).toBe(false);
  });

  it("and/or matchers compose child specs", () => {
    const rule = compilePatchEntry(
      viaJson(
        makeEntry({
          match: {
            type: "and",
            all: [
              { type: "tag", tags: ["section"] },
              {
                type: "or",
                any: [
                  { type: "style-prop", props: ["gap"] },
                  { type: "attr", attrs: ["data-flex"] },
                ],
              },
            ],
          },
        })
      )
    );
    expect(rule.matcher(el("section", { style: "gap: 4px" }))).toBe(true);
    expect(rule.matcher(el("section", { "data-flex": "1" }))).toBe(true);
    expect(rule.matcher(el("section", { style: "color: red" }))).toBe(false);
    expect(rule.matcher(el("div", { style: "gap: 4px" }))).toBe(false);
  });

  it("non-element nodes never match", () => {
    const rule = compilePatchEntry(viaJson(makeEntry()));
    const textNode: Node = { type: "text", value: "hi" } as Node;
    expect(rule.matcher(textNode)).toBe(false);
  });
});

describe("compilePatchEntry: transform whitelist", () => {
  it("remove-css-declarations strips the listed properties", () => {
    const rule = compilePatchEntry(viaJson(makeEntry()));
    const node = el("section", { style: "gap: 8px; color: red" });
    const out = rule.transform(node) as Element;
    expect(String(out.properties?.style ?? "")).not.toContain("gap");
    expect(String(out.properties?.style ?? "")).toContain("color");
  });

  it("clamp-px clamps listed properties into [minPx, maxPx]", () => {
    const rule = compilePatchEntry(
      viaJson(
        makeEntry({
          match: { type: "style-prop", props: ["font-size"] },
          apply: {
            transform: "clamp-px",
            params: { props: ["font-size"], minPx: 12, maxPx: 40 },
          },
        })
      )
    );
    const out = rule.transform(el("p", { style: "font-size: 99px" })) as Element;
    expect(String(out.properties?.style)).toContain("40px");
  });

  it("set-style-property writes the property value", () => {
    const rule = compilePatchEntry(
      viaJson(
        makeEntry({
          apply: { transform: "set-style-property", params: { prop: "display", value: "block" } },
        })
      )
    );
    const out = rule.transform(el("section", { style: "gap: 1px" })) as Element;
    expect(String(out.properties?.style)).toContain("display:block");
  });

  it("remove-attributes drops the listed attributes", () => {
    const rule = compilePatchEntry(
      viaJson(
        makeEntry({
          match: { type: "attr", attrs: ["data-track"] },
          apply: { transform: "remove-attributes", params: { attrs: ["data-track"] } },
        })
      )
    );
    const out = rule.transform(el("span", { "data-track": "x", id: "keep" })) as Element;
    expect(out.properties?.["data-track"]).toBeUndefined();
    expect(out.properties?.id).toBe("keep");
  });

  it("drop-node returns null to delete the matched node", () => {
    const rule = compilePatchEntry(
      viaJson(
        makeEntry({
          match: { type: "tag", tags: ["iframe"] },
          apply: { transform: "drop-node" },
        })
      )
    );
    expect(rule.transform(el("iframe"))).toBeNull();
  });

  it("registerPatchTransform makes a custom transform id usable from JSON entries", () => {
    registerPatchTransform("test-uppercase-tag", () => (node) => {
      const e = node as Element;
      return { ...e, tagName: e.tagName.toUpperCase() };
    });
    const rule = compilePatchEntry(
      viaJson(makeEntry({ apply: { transform: "test-uppercase-tag" } }))
    );
    const out = rule.transform(el("em", { style: "gap: 1px" })) as Element;
    expect(out.tagName).toBe("EM");
  });
});

describe("compilePatchEntry: fail-closed validation", () => {
  it("unknown matcher type throws PatchLoadError naming the entry id", () => {
    const entry = makeEntry({ id: "bad-matcher-entry" });
    (entry.match as { type: string }).type = "regex";
    expect(() => compilePatchEntry(viaJson(entry))).toThrow(PatchLoadError);
    expect(() => compilePatchEntry(viaJson(entry))).toThrow(/bad-matcher-entry/);
  });

  it("unregistered transform id throws PatchLoadError naming the id and transform", () => {
    const entry = makeEntry({
      id: "bad-transform-entry",
      apply: { transform: "eval-js" },
    });
    expect(() => compilePatchEntry(viaJson(entry))).toThrow(PatchLoadError);
    expect(() => compilePatchEntry(viaJson(entry))).toThrow(/eval-js/);
  });

  it("invalid params (empty props array) throw PatchLoadError", () => {
    const entry = makeEntry({
      match: { type: "style-prop", props: [] },
    });
    expect(() => compilePatchEntry(viaJson(entry))).toThrow(PatchLoadError);
  });

  it("lint scope is rejected for declarative entries (diagnose cannot be serialized)", () => {
    const entry = makeEntry();
    (entry as { scope: string }).scope = "lint";
    expect(() => compilePatchEntry(viaJson(entry))).toThrow(PatchLoadError);
  });
});

describe("declarative bundles: end-to-end load and apply", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetchJson(body: unknown): void {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }))
    );
  }

  it("loadPatchBundle resolves a pure-JSON declarative bundle", async () => {
    stubFetchJson({ version: "1.2.0", formatVersion: 1, patches: [makeEntry()] });
    const bundle = await loadPatchBundle("https://patches.example/bundle.json");
    expect(bundle.version).toBe("1.2.0");
    expect(bundle.patches).toHaveLength(1);
  });

  it("applyPatchBundle injects a declarative entry as an executable rule", () => {
    const entry = makeEntry({ id: "dsl-e2e-strip-gap" });
    applyPatchBundle(viaJson({ version: "1.0.1", patches: [entry] }));
    const rule = getRules().find((r) => r.id === "dsl-e2e-strip-gap");
    expect(rule).toBeDefined();
    expect(rule?.matcher(el("section", { style: "gap: 2px" }))).toBe(true);
    const out = rule?.transform(el("section", { style: "gap: 2px; color: red" })) as Element;
    expect(String(out.properties?.style ?? "")).not.toContain("gap");
  });

  it("applyPatchBundle rejects atomically: one invalid entry means zero injection", () => {
    const good = makeEntry({ id: "dsl-atomic-good" });
    const bad = makeEntry({ id: "dsl-atomic-bad", apply: { transform: "not-registered" } });
    expect(() => applyPatchBundle(viaJson({ version: "1.0.0", patches: [good, bad] }))).toThrow(
      PatchLoadError
    );
    expect(getRules().some((r) => r.id === "dsl-atomic-good")).toBe(false);
  });

  it("unsupported formatVersion is rejected", async () => {
    stubFetchJson({ version: "1.0.0", formatVersion: 2, patches: [] });
    await expect(loadPatchBundle("https://patches.example/v2.json")).rejects.toThrow(
      PatchLoadError
    );
  });

  it("JSON entries with neither functions nor match/apply are still rejected", async () => {
    stubFetchJson({
      version: "1.0.0",
      patches: [{ id: "no-op-entry", scope: "strip", priority: 10 }],
    });
    await expect(loadPatchBundle("https://patches.example/legacy.json")).rejects.toThrow(
      PatchLoadError
    );
  });
});
