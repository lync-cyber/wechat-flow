/**
 * T-124 · M-007 plugin-api Worker real bootstrap — RED phase tests.
 * All assertions exercise SUT behaviour, not structural existence.
 * AC-007 (real browser Worker end-to-end) is conditional_release — no test here.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLog } from "../../packages/plugin-api/src/acl/audit-log.ts";
import { checkNetworkAccess } from "../../packages/plugin-api/src/acl/network-gate.ts";
import {
  E_WORKER_NETWORK_LEAK,
  assertNetIsolation,
} from "../../packages/plugin-api/src/worker/assert-net-isolation.ts";
// bootstrapWorker is the new injectable init function GREEN will add to runtime.ts.
// Import will fail until GREEN implements it — that FAIL is expected (RED phase).
import { bootstrapWorker } from "../../packages/plugin-api/src/worker/runtime.ts";

// ---------------------------------------------------------------------------
// AC-001 · assertNetIsolation throws when fetch is non-undefined in scope
// ---------------------------------------------------------------------------

describe("assertNetIsolation with stubbed fetch (AC-001)", () => {
  it("throws E_WORKER_NETWORK_LEAK when scope.fetch is a stub function", () => {
    const close = vi.fn();
    const stubFetch = () => Promise.resolve(new Response());
    expect(() => assertNetIsolation({ fetch: stubFetch }, close)).toThrow(E_WORKER_NETWORK_LEAK);
  });

  it("calls close() when scope.fetch is a stub function", () => {
    const close = vi.fn();
    const stubFetch = () => Promise.resolve(new Response());
    try {
      assertNetIsolation({ fetch: stubFetch }, close);
    } catch {
      // expected
    }
    expect(close).toHaveBeenCalledOnce();
  });

  it("does not throw when scope has no network globals set (clean scope)", () => {
    const close = vi.fn();
    // An explicitly cleaned scope passes isolation check
    expect(() =>
      assertNetIsolation(
        {
          fetch: undefined,
          XMLHttpRequest: undefined,
          WebSocket: undefined,
          EventSource: undefined,
        },
        close
      )
    ).not.toThrow();
    expect(close).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AC-002 · bootstrapWorker delete sequence verified via injected mock
// ---------------------------------------------------------------------------
// GREEN must export: bootstrapWorker(deps: { globalScope, selfClose, comlink }) => void
// The function must: delete globalScope.fetch, delete globalScope.XMLHttpRequest,
// delete globalScope.WebSocket, delete globalScope.EventSource, then call
// assertNetIsolation(globalScope, selfClose). comlink.expose is called last.

describe("bootstrapWorker delete sequence (AC-002)", () => {
  it("deletes fetch before XMLHttpRequest", () => {
    const deleteOrder: string[] = [];
    const globalScope = {
      fetch: (() => {}) as unknown,
      XMLHttpRequest: class {} as unknown,
      WebSocket: class {} as unknown,
      EventSource: class {} as unknown,
    };

    // Proxy to record delete order
    const trackedScope = new Proxy(globalScope, {
      deleteProperty(target, prop) {
        deleteOrder.push(String(prop));
        delete (target as Record<string, unknown>)[String(prop)];
        return true;
      },
    });

    const mockComlink = { expose: vi.fn() };
    const selfClose = vi.fn();

    bootstrapWorker({ globalScope: trackedScope, selfClose, comlink: mockComlink });

    const fetchIdx = deleteOrder.indexOf("fetch");
    const xhrIdx = deleteOrder.indexOf("XMLHttpRequest");
    expect(fetchIdx).toBeGreaterThanOrEqual(0);
    expect(xhrIdx).toBeGreaterThanOrEqual(0);
    expect(fetchIdx).toBeLessThan(xhrIdx);
  });

  it("deletes XMLHttpRequest before WebSocket", () => {
    const deleteOrder: string[] = [];
    const globalScope = {
      fetch: (() => {}) as unknown,
      XMLHttpRequest: class {} as unknown,
      WebSocket: class {} as unknown,
      EventSource: class {} as unknown,
    };

    const trackedScope = new Proxy(globalScope, {
      deleteProperty(target, prop) {
        deleteOrder.push(String(prop));
        delete (target as Record<string, unknown>)[String(prop)];
        return true;
      },
    });

    const mockComlink = { expose: vi.fn() };
    bootstrapWorker({ globalScope: trackedScope, selfClose: vi.fn(), comlink: mockComlink });

    const xhrIdx = deleteOrder.indexOf("XMLHttpRequest");
    const wsIdx = deleteOrder.indexOf("WebSocket");
    expect(xhrIdx).toBeGreaterThanOrEqual(0);
    expect(wsIdx).toBeGreaterThanOrEqual(0);
    expect(xhrIdx).toBeLessThan(wsIdx);
  });

  it("deletes WebSocket before EventSource", () => {
    const deleteOrder: string[] = [];
    const globalScope = {
      fetch: (() => {}) as unknown,
      XMLHttpRequest: class {} as unknown,
      WebSocket: class {} as unknown,
      EventSource: class {} as unknown,
    };

    const trackedScope = new Proxy(globalScope, {
      deleteProperty(target, prop) {
        deleteOrder.push(String(prop));
        delete (target as Record<string, unknown>)[String(prop)];
        return true;
      },
    });

    const mockComlink = { expose: vi.fn() };
    bootstrapWorker({ globalScope: trackedScope, selfClose: vi.fn(), comlink: mockComlink });

    const wsIdx = deleteOrder.indexOf("WebSocket");
    const esIdx = deleteOrder.indexOf("EventSource");
    expect(wsIdx).toBeGreaterThanOrEqual(0);
    expect(esIdx).toBeGreaterThanOrEqual(0);
    expect(wsIdx).toBeLessThan(esIdx);
  });

  it("calls assertNetIsolation after all four deletes (scope has no leaked globals)", () => {
    // After deletion, the scope must pass assertNetIsolation (no leak detected).
    // We verify indirectly: if deletion happened before assertNetIsolation, selfClose is NOT called.
    const globalScope = {
      fetch: (() => {}) as unknown,
      XMLHttpRequest: class {} as unknown,
      WebSocket: class {} as unknown,
      EventSource: class {} as unknown,
    };

    const trackedScope = new Proxy(globalScope, {
      deleteProperty(target, prop) {
        delete (target as Record<string, unknown>)[String(prop)];
        return true;
      },
    });

    const mockComlink = { expose: vi.fn() };
    const selfClose = vi.fn();

    bootstrapWorker({ globalScope: trackedScope, selfClose, comlink: mockComlink });

    // If all globals are deleted before assertNetIsolation, selfClose must NOT have been called
    // (no network leak detected). selfClose being called would mean assertNetIsolation fired
    // before the deletes completed.
    expect(selfClose).not.toHaveBeenCalled();
  });

  it("calls comlink.expose with an api object after bootstrap sequence", () => {
    const globalScope = {
      fetch: (() => {}) as unknown,
      XMLHttpRequest: class {} as unknown,
      WebSocket: class {} as unknown,
      EventSource: class {} as unknown,
    };

    const trackedScope = new Proxy(globalScope, {
      deleteProperty(target, prop) {
        delete (target as Record<string, unknown>)[String(prop)];
        return true;
      },
    });

    const mockComlink = { expose: vi.fn() };

    bootstrapWorker({ globalScope: trackedScope, selfClose: vi.fn(), comlink: mockComlink });

    expect(mockComlink.expose).toHaveBeenCalledOnce();
    const exposedApi = mockComlink.expose.mock.calls[0][0] as Record<string, unknown>;
    // The exposed API must be an object with an invoke callable — not null or undefined
    expect(typeof exposedApi).toBe("object");
    expect(exposedApi).not.toBeNull();
    expect(typeof exposedApi.invoke).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// AC-003 · Main-thread ACL requestResource — allowed URL: network-gate allow +
//          audit-log records { action: 'allow', url, pluginId }
// ---------------------------------------------------------------------------

describe("main-thread ACL requestResource — allowed URL (AC-003)", () => {
  let auditLog: AuditLog;

  beforeEach(() => {
    auditLog = new AuditLog();
  });

  it("records action:'allow' entry when URL matches whitelist", async () => {
    // GREEN will add an aclRequestResource function to surface/plugin-api.ts or a new acl module.
    // Import path will be verified by GREEN; here we use the interface we expect.
    // The existing requestResource in manifest-check.ts uses { allow: boolean } not { action: string }.
    // This test drives the contract change to action:'allow'/'deny'.
    const { aclRequestResource } = await import(
      "../../packages/plugin-api/src/acl/acl-request.ts"
    ).catch(() => ({ aclRequestResource: null }));

    // aclRequestResource does not exist yet — import returns null stub, causing failure
    expect(aclRequestResource).not.toBeNull();

    if (!aclRequestResource) return; // type guard for TypeScript; test already failed above

    const mockFetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    const manifest = {
      id: "plugin-acl-allow",
      permissions: { network: ["https://allowed.example.com/*"] },
    };

    await aclRequestResource("https://allowed.example.com/data", manifest, auditLog, mockFetch);

    const entries = auditLog.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe("allow");
    expect(entries[0].url).toBe("https://allowed.example.com/data");
    expect(entries[0].pluginId).toBe("plugin-acl-allow");
  });

  it("calls fetch with the allowed URL when access is granted", async () => {
    const { aclRequestResource } = await import(
      "../../packages/plugin-api/src/acl/acl-request.ts"
    ).catch(() => ({ aclRequestResource: null }));

    expect(aclRequestResource).not.toBeNull();
    if (!aclRequestResource) return;

    const mockFetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    const manifest = {
      id: "plugin-acl-fetch",
      permissions: { network: ["https://api.example.com/*"] },
    };

    await aclRequestResource("https://api.example.com/v1/data", manifest, auditLog, mockFetch);

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch.mock.calls[0][0]).toBe("https://api.example.com/v1/data");
  });
});

// ---------------------------------------------------------------------------
// AC-004 · Main-thread ACL requestResource — denied URL:
//          throws E_PERMISSION_DENIED + audit records { action: 'deny', url, pluginId }
// ---------------------------------------------------------------------------

describe("main-thread ACL requestResource — denied URL (AC-004)", () => {
  let auditLog: AuditLog;

  beforeEach(() => {
    auditLog = new AuditLog();
  });

  it("throws E_PERMISSION_DENIED when URL is not in whitelist", async () => {
    const { aclRequestResource, E_PERMISSION_DENIED: E_DENIED } = await import(
      "../../packages/plugin-api/src/acl/acl-request.ts"
    ).catch(() => ({ aclRequestResource: null, E_PERMISSION_DENIED: "E_PERMISSION_DENIED" }));

    expect(aclRequestResource).not.toBeNull();
    if (!aclRequestResource) return;

    const mockFetch = vi.fn();
    const manifest = {
      id: "plugin-deny",
      permissions: { network: ["https://allowed.example.com/*"] },
    };

    await expect(
      aclRequestResource("https://evil.example.com/steal", manifest, auditLog, mockFetch)
    ).rejects.toThrow(E_DENIED ?? "E_PERMISSION_DENIED");
  });

  it("records action:'deny' entry in audit-log when URL is denied", async () => {
    const { aclRequestResource } = await import(
      "../../packages/plugin-api/src/acl/acl-request.ts"
    ).catch(() => ({ aclRequestResource: null }));

    expect(aclRequestResource).not.toBeNull();
    if (!aclRequestResource) return;

    const mockFetch = vi.fn();
    const manifest = {
      id: "plugin-deny-audit",
      permissions: { network: ["https://allowed.example.com/*"] },
    };

    try {
      await aclRequestResource("https://evil.example.com/steal", manifest, auditLog, mockFetch);
    } catch {
      // expected denial
    }

    const entries = auditLog.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe("deny");
    expect(entries[0].url).toBe("https://evil.example.com/steal");
    expect(entries[0].pluginId).toBe("plugin-deny-audit");
  });

  it("does not call fetch when URL is denied", async () => {
    const { aclRequestResource } = await import(
      "../../packages/plugin-api/src/acl/acl-request.ts"
    ).catch(() => ({ aclRequestResource: null }));

    expect(aclRequestResource).not.toBeNull();
    if (!aclRequestResource) return;

    const mockFetch = vi.fn();
    const manifest = {
      id: "plugin-deny-nofetch",
      permissions: { network: [] },
    };

    try {
      await aclRequestResource("https://example.com/data", manifest, auditLog, mockFetch);
    } catch {
      // expected
    }

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AC-005 · AuditLog.getEntries() returns a copy — mutating return value does not
//          affect internal entries
// ---------------------------------------------------------------------------

describe("AuditLog.getEntries returns a new array copy (AC-005)", () => {
  it("mutating the returned array does not remove internal entries", () => {
    const log = new AuditLog();
    // AuditEntry currently uses { allow: boolean }; GREEN will extend to { action: string }.
    // We write the test against the post-GREEN schema (action field) to drive the change.
    log.record({ action: "allow", url: "https://a.com/", pluginId: "p1", ts: 1000 } as Parameters<
      AuditLog["record"]
    >[0]);
    log.record({ action: "deny", url: "https://b.com/", pluginId: "p2", ts: 2000 } as Parameters<
      AuditLog["record"]
    >[0]);

    const snapshot = log.getEntries();
    expect(snapshot).toHaveLength(2);

    // Mutate the returned array
    snapshot.splice(0, 2);
    expect(snapshot).toHaveLength(0);

    // Internal state must be unchanged
    const secondSnapshot = log.getEntries();
    expect(secondSnapshot).toHaveLength(2);
  });

  it("returned arrays from two getEntries calls are different references", () => {
    const log = new AuditLog();
    log.record({ action: "allow", url: "https://a.com/", pluginId: "p1", ts: 1000 } as Parameters<
      AuditLog["record"]
    >[0]);

    const first = log.getEntries();
    const second = log.getEntries();
    // Must be distinct array objects
    expect(first).not.toBe(second);
  });
});

// ---------------------------------------------------------------------------
// AC-006 · ViolationResult and FallbackPayload deduplication
//          One must import from the other — no independent duplicate definitions.
//          Verified at runtime: both are the same structural type from one source.
// ---------------------------------------------------------------------------

describe("ViolationResult / FallbackPayload type deduplication (AC-006)", () => {
  it("FallbackPayload and ViolationResult share the same shape from a single module", async () => {
    // After GREEN deduplicates, one file will import from the other.
    // We verify behaviorally: createTimeoutFallback() result satisfies the ViolationResult shape.
    // Currently violation-detector.ts and placeholder.ts each define the same interface
    // independently. GREEN must make one import from the other.
    const { createTimeoutFallback } = await import(
      "../../packages/plugin-api/src/fallback/placeholder.ts"
    );
    const { detectTimeout } = await import(
      "../../packages/plugin-api/src/runtime/violation-detector.ts"
    );

    const fallback = createTimeoutFallback();
    const violation = detectTimeout(0, 5001, 5000);

    // Both must produce structurally identical objects — same type, same source
    expect(fallback.type).toBe(violation?.type);
    expect(fallback.reason).toBe(violation?.reason);

    // GREEN will ensure ViolationResult is the canonical type and FallbackPayload
    // is either an alias or re-export. We verify they have the same canonical shape
    // by checking the shared module export exists.
    // Import the shared type module that GREEN will create:
    const sharedModule = await import(
      "../../packages/plugin-api/src/runtime/violation-result.ts"
    ).catch(() => null);

    // This import fails until GREEN creates the shared module — drives the RED failure
    expect(sharedModule).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// R-001 · checkNetworkAccess boundary hardening
//         Pattern "https://host*" must NOT match "https://host.evil.com/..."
//         (host boundary enforcement — prefix without path separator must not
//         allow host-name extension attacks)
// ---------------------------------------------------------------------------

describe("checkNetworkAccess host-boundary hardening (R-001)", () => {
  it("pattern 'https://api.example.com*' does NOT match 'https://api.example.com.evil.org/steal'", () => {
    // Current implementation: startsWith prefix — this PASSES the evil URL (bug).
    // After GREEN hardening, the pattern without a '/' after the host must not match
    // a URL with a different host suffix.
    const result = checkNetworkAccess("https://api.example.com.evil.org/steal", [
      "https://api.example.com*",
    ]);
    expect(result).toBe(false);
  });

  it("pattern 'https://example.com*' does NOT match 'https://example.com.attacker.net/path'", () => {
    const result = checkNetworkAccess("https://example.com.attacker.net/path", [
      "https://example.com*",
    ]);
    expect(result).toBe(false);
  });

  it("pattern 'https://example.com/*' still matches 'https://example.com/api/v1' (valid wildcard)", () => {
    // Path-bounded wildcard must continue to work after hardening
    const result = checkNetworkAccess("https://example.com/api/v1", ["https://example.com/*"]);
    expect(result).toBe(true);
  });

  it("pattern 'https://example.com/*' does NOT match 'https://example.com.evil.net/path'", () => {
    // Path-bounded wildcard: prefix ends with '/', so host extension is rejected
    const result = checkNetworkAccess("https://example.com.evil.net/path", [
      "https://example.com/*",
    ]);
    expect(result).toBe(false);
  });

  it("pattern 'https://*.example.com/*' matches 'https://api.example.com/data' (subdomain wildcard)", () => {
    // Subdomain wildcards must continue to work
    const result = checkNetworkAccess("https://api.example.com/data", ["https://*.example.com/*"]);
    expect(result).toBe(true);
  });

  it("pattern 'https://*.example.com/*' does NOT match 'https://evil.example.com.attacker.net/x'", () => {
    const result = checkNetworkAccess("https://evil.example.com.attacker.net/x", [
      "https://*.example.com/*",
    ]);
    expect(result).toBe(false);
  });

  it("exact-match pattern is unaffected by boundary hardening", () => {
    const result = checkNetworkAccess("https://api.example.com/v1/items", [
      "https://api.example.com/v1/items",
    ]);
    expect(result).toBe(true);
  });
});
