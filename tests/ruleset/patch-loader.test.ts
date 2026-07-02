import type { Node } from "hast";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getRules, registerRule } from "../../packages/ruleset/src/index.ts";
import type { RuleDefinition } from "../../packages/ruleset/src/index.ts";
import {
  PatchLoadError,
  applyPatchBundle,
  loadPatchBundle,
} from "../../packages/ruleset/src/patch-loader.ts";
import type { PatchBundle } from "../../packages/ruleset/src/patch-loader.ts";

// ── helpers ───────────────────────────────────────────────────────────────────

function noop(_node: Node): Node {
  return _node;
}

function matchNone(_node: Node): boolean {
  return false;
}

function makePatchRule(id: string): RuleDefinition {
  return {
    id,
    scope: "patch",
    priority: 100,
    matcher: matchNone,
    transform: noop,
  };
}

function makeBundle(version: string, patches: RuleDefinition[]): PatchBundle {
  return { version, patches };
}

// Tests are isolated by globally-unique rule ids; the shared registry is not reset between cases.

// ── AC-001: loadPatchBundle loads JSON from URL ───────────────────────────────

describe("T-060 AC-001: loadPatchBundle(url) fetches and parses JSON patch bundle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves with PatchBundle containing version and patches from fetched JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          version: "8.0.0",
          patches: [
            {
              id: "patch-wechat-8.0-fix-span",
              scope: "patch",
              priority: 100,
              matcher: matchNone,
              transform: noop,
            },
          ],
        }),
      })
    );

    const result = await loadPatchBundle("https://cdn.example.com/patch-8.0.0.json");
    expect(result.version).toBe("8.0.0");
    expect(result.patches).toHaveLength(1);
    expect(result.patches[0].id).toBe("patch-wechat-8.0-fix-span");
  });

  it("resolves with correct version string (microcode client version semantics)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          version: "8.0.33",
          patches: [
            { id: "patch-abc", scope: "patch", priority: 50, matcher: matchNone, transform: noop },
          ],
        }),
      })
    );

    const result = await loadPatchBundle("https://example.com/bundle.json");
    expect(result.version).toBe("8.0.33");
  });

  it("rejects a bundle whose JSON came from a real JSON.parse round-trip (no function fields survive serialization)", async () => {
    const serialized = JSON.stringify({
      version: "8.0.0",
      patches: [{ id: "patch-wechat-8.0-real-json", scope: "patch", priority: 100 }],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => JSON.parse(serialized),
      })
    );

    await expect(loadPatchBundle("https://cdn.example.com/patch-real-8.0.0.json")).rejects.toThrow(
      PatchLoadError
    );
    await expect(loadPatchBundle("https://cdn.example.com/patch-real-8.0.0.json")).rejects.toThrow(
      /matcher.*transform|function/i
    );
  });

  it("resolves successfully for a JSON bundle with an empty patches array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => JSON.parse(JSON.stringify({ version: "8.0.0", patches: [] })),
      })
    );

    const result = await loadPatchBundle("https://cdn.example.com/patch-empty.json");
    expect(result.version).toBe("8.0.0");
    expect(result.patches).toEqual([]);
  });
});

// ── AC-002: applyPatchBundle injects rules into getRules() ────────────────────

describe("T-060 AC-002: applyPatchBundle injects patch rules — getRules() reflects them immediately", () => {
  it("getRules() contains the new patch rule id after applyPatchBundle", () => {
    const rule = makePatchRule("patch-t060-ac002-new");
    const bundle = makeBundle("9.0.0", [rule]);

    const before = getRules().map((r) => r.id);
    expect(before).not.toContain("patch-t060-ac002-new");

    applyPatchBundle(bundle);

    const after = getRules().map((r) => r.id);
    expect(after).toContain("patch-t060-ac002-new");
  });

  it("after applyPatchBundle the injected rule object is the same as what was passed", () => {
    const rule = makePatchRule("patch-t060-ac002-identity");
    const bundle = makeBundle("9.0.0", [rule]);

    applyPatchBundle(bundle);

    const found = getRules().find((r) => r.id === "patch-t060-ac002-identity");
    expect(found).toBeDefined();
    expect(found?.scope).toBe("patch");
    expect(found?.priority).toBe(100);
  });

  it("multiple patches in bundle are all injected", () => {
    const r1 = makePatchRule("patch-t060-multi-1");
    const r2 = makePatchRule("patch-t060-multi-2");
    const bundle = makeBundle("9.0.0", [r1, r2]);

    applyPatchBundle(bundle);

    const ids = getRules().map((r) => r.id);
    expect(ids).toContain("patch-t060-multi-1");
    expect(ids).toContain("patch-t060-multi-2");
  });
});

// ── AC-003: error handling — PatchLoadError, registry untouched ───────────────

describe("T-060 AC-003: load/apply failures throw PatchLoadError and leave registry intact", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loadPatchBundle throws PatchLoadError on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(loadPatchBundle("https://unreachable.example.com/patch.json")).rejects.toThrow(
      PatchLoadError
    );
  });

  it("loadPatchBundle throws PatchLoadError with descriptive message on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(loadPatchBundle("https://unreachable.example.com/patch.json")).rejects.toThrow(
      /fetch/i
    );
  });

  it("loadPatchBundle throws PatchLoadError when response is not ok (HTTP 404)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      })
    );

    await expect(loadPatchBundle("https://example.com/missing.json")).rejects.toThrow(
      PatchLoadError
    );
  });

  it("loadPatchBundle throws PatchLoadError on invalid schema — missing version field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          patches: [{ id: "p", scope: "patch", priority: 1 }],
          // version is missing
        }),
      })
    );

    await expect(loadPatchBundle("https://example.com/bad-schema.json")).rejects.toThrow(
      PatchLoadError
    );
  });

  it("loadPatchBundle throws PatchLoadError on invalid schema — patches not an array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          version: "8.0.0",
          patches: "not-an-array",
        }),
      })
    );

    await expect(loadPatchBundle("https://example.com/bad-schema.json")).rejects.toThrow(
      PatchLoadError
    );
  });

  it("loadPatchBundle throws PatchLoadError when a patch entry is missing id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          version: "8.0.0",
          patches: [{ scope: "patch", priority: 1 }], // no id
        }),
      })
    );

    await expect(loadPatchBundle("https://example.com/bad-schema.json")).rejects.toThrow(
      PatchLoadError
    );
  });

  it("applyPatchBundle with invalid bundle (no patches array) throws PatchLoadError", () => {
    const bad = { version: "8.0.0" } as unknown as PatchBundle;
    expect(() => applyPatchBundle(bad)).toThrow(PatchLoadError);
  });

  it("getRules() is unchanged after a failed applyPatchBundle call", () => {
    const rulesBefore = getRules().map((r) => r.id);
    const bad = { version: "8.0.0" } as unknown as PatchBundle;

    try {
      applyPatchBundle(bad);
    } catch (_e) {
      // expected
    }

    const rulesAfter = getRules().map((r) => r.id);
    expect(rulesAfter).toEqual(rulesBefore);
  });

  it("partial invalid bundle (one bad patch entry) — getRules() is unchanged after throw", () => {
    const goodRule = makePatchRule("patch-t060-partial-good");
    const badEntry = { id: undefined, scope: "patch" } as unknown as RuleDefinition;
    const bundle = { version: "8.0.0", patches: [goodRule, badEntry] };
    const rulesBefore = getRules().map((r) => r.id);

    try {
      applyPatchBundle(bundle as PatchBundle);
    } catch (_e) {
      // expected
    }

    const rulesAfter = getRules().map((r) => r.id);
    expect(rulesAfter).toEqual(rulesBefore);
    expect(rulesAfter).not.toContain("patch-t060-partial-good");
  });
});

// ── matcher/transform executability + scope enum validation ──────────────────

describe("T-060: patch entries missing executable matcher/transform are rejected", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loadPatchBundle rejects a bundle whose patches carry no function fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          version: "8.0.0",
          patches: [{ id: "patch-json-only", scope: "patch", priority: 1 }],
        }),
      })
    );

    await expect(loadPatchBundle("https://example.com/json-only.json")).rejects.toThrow(
      PatchLoadError
    );
    await expect(loadPatchBundle("https://example.com/json-only.json")).rejects.toThrow(
      /matcher.*transform|function/i
    );
  });

  it("loadPatchBundle resolves for a bundle with an empty patches array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ version: "8.0.0", patches: [] }),
      })
    );

    const result = await loadPatchBundle("https://example.com/empty.json");
    expect(result.patches).toEqual([]);
  });

  it("applyPatchBundle throws PatchLoadError when a patch entry lacks matcher/transform, and does not inject it", () => {
    const badEntry = {
      id: "patch-t060-no-functions",
      scope: "patch",
      priority: 1,
    } as unknown as RuleDefinition;
    const bundle = makeBundle("8.0.0", [badEntry]);

    expect(() => applyPatchBundle(bundle)).toThrow(PatchLoadError);

    const ids = getRules().map((r) => r.id);
    expect(ids).not.toContain("patch-t060-no-functions");
  });

  it("applyPatchBundle rejects the whole bundle atomically when one entry lacks matcher/transform, even if another entry is valid", () => {
    const validRule = makePatchRule("patch-t060-mixed-valid");
    const invalidRule = {
      id: "patch-t060-mixed-invalid",
      scope: "patch",
      priority: 1,
    } as unknown as RuleDefinition;
    const bundle = makeBundle("8.0.0", [validRule, invalidRule]);

    expect(() => applyPatchBundle(bundle)).toThrow(PatchLoadError);

    const ids = getRules().map((r) => r.id);
    expect(ids).not.toContain("patch-t060-mixed-valid");
    expect(ids).not.toContain("patch-t060-mixed-invalid");
  });
});

describe("T-060: patch entry 'scope' must be a valid RuleScope enum value", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loadPatchBundle rejects an unknown scope value", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          version: "8.0.0",
          patches: [
            {
              id: "patch-bad-scope",
              scope: "unknown-scope",
              priority: 1,
              matcher: matchNone,
              transform: noop,
            },
          ],
        }),
      })
    );

    await expect(loadPatchBundle("https://example.com/bad-scope.json")).rejects.toThrow(
      PatchLoadError
    );
  });

  it("applyPatchBundle rejects an unknown scope value and does not inject the rule", () => {
    const badScopeRule = {
      id: "patch-t060-bad-scope",
      scope: "unknown-scope",
      priority: 1,
      matcher: matchNone,
      transform: noop,
    } as unknown as RuleDefinition;
    const bundle = makeBundle("8.0.0", [badScopeRule]);

    expect(() => applyPatchBundle(bundle)).toThrow(PatchLoadError);

    const ids = getRules().map((r) => r.id);
    expect(ids).not.toContain("patch-t060-bad-scope");
  });
});

// ── AC-004: upsert-by-id — same id overwrites existing entry ─────────────────

describe("T-060 AC-004: same rule id in patch bundle overwrites existing rule (upsert semantics)", () => {
  it("applying a patch with duplicate id replaces existing rule — getRules() has only one entry for that id", () => {
    const original = makePatchRule("patch-t060-ac004-upsert");
    registerRule(original);

    const countBefore = getRules().filter((r) => r.id === "patch-t060-ac004-upsert").length;
    expect(countBefore).toBe(1);

    const updated: RuleDefinition = {
      ...original,
      priority: 999,
    };
    const bundle = makeBundle("8.0.1", [updated]);
    applyPatchBundle(bundle);

    const matching = getRules().filter((r) => r.id === "patch-t060-ac004-upsert");
    expect(matching).toHaveLength(1);
    expect(matching[0].priority).toBe(999);
  });

  it("applying same patch bundle twice still results in one entry per id", () => {
    const rule = makePatchRule("patch-t060-ac004-idempotent");
    const bundle = makeBundle("8.0.0", [rule]);

    applyPatchBundle(bundle);
    applyPatchBundle(bundle);

    const matching = getRules().filter((r) => r.id === "patch-t060-ac004-idempotent");
    expect(matching).toHaveLength(1);
  });

  it("upsert updates the rule value — later apply's rule definition wins", () => {
    const v1: RuleDefinition = {
      id: "patch-t060-ac004-version-wins",
      scope: "patch",
      priority: 10,
      matcher: matchNone,
      transform: noop,
    };
    const v2: RuleDefinition = {
      id: "patch-t060-ac004-version-wins",
      scope: "patch",
      priority: 20,
      matcher: matchNone,
      transform: noop,
    };

    applyPatchBundle(makeBundle("8.0.0", [v1]));
    applyPatchBundle(makeBundle("8.0.1", [v2]));

    const found = getRules().find((r) => r.id === "patch-t060-ac004-version-wins");
    expect(found?.priority).toBe(20);
  });
});
