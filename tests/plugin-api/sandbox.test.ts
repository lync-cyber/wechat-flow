/**
 * T-047 · M-007 Plugin sandbox Worker skeleton — RED phase tests.
 * All assertions exercise the SUT's behaviour (not structural existence).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLog } from "../../packages/plugin-api/src/acl/audit-log.ts";
import { checkNetworkAccess } from "../../packages/plugin-api/src/acl/network-gate.ts";
import { createTimeoutFallback } from "../../packages/plugin-api/src/fallback/placeholder.ts";
import { detectTimeout } from "../../packages/plugin-api/src/runtime/violation-detector.ts";
import {
  E_PERMISSION_DENIED,
  requestResource,
} from "../../packages/plugin-api/src/validation/manifest-check.ts";
import {
  E_WORKER_NETWORK_LEAK,
  assertNetIsolation,
} from "../../packages/plugin-api/src/worker/assert-net-isolation.ts";

// ---------------------------------------------------------------------------
// AC-001 / AC-005 · Worker-scope network isolation
// ---------------------------------------------------------------------------

describe("assertNetIsolation (AC-001, AC-005)", () => {
  it("does not call close() when all network globals are absent", () => {
    const close = vi.fn();
    // scope with no network globals — isolation is intact
    assertNetIsolation({}, close);
    expect(close).not.toHaveBeenCalled();
  });

  it("throws E_WORKER_NETWORK_LEAK and calls close() when fetch is present", () => {
    const close = vi.fn();
    expect(() => assertNetIsolation({ fetch: globalThis.fetch ?? (() => {}) }, close)).toThrow(
      E_WORKER_NETWORK_LEAK
    );
    expect(close).toHaveBeenCalledOnce();
  });

  it("throws E_WORKER_NETWORK_LEAK and calls close() when XMLHttpRequest is present", () => {
    const close = vi.fn();
    expect(() => assertNetIsolation({ XMLHttpRequest: class {} }, close)).toThrow(
      E_WORKER_NETWORK_LEAK
    );
    expect(close).toHaveBeenCalledOnce();
  });

  it("throws E_WORKER_NETWORK_LEAK and calls close() when WebSocket is present", () => {
    const close = vi.fn();
    expect(() => assertNetIsolation({ WebSocket: class {} }, close)).toThrow(E_WORKER_NETWORK_LEAK);
    expect(close).toHaveBeenCalledOnce();
  });

  it("throws E_WORKER_NETWORK_LEAK and calls close() when EventSource is present", () => {
    const close = vi.fn();
    expect(() => assertNetIsolation({ EventSource: class {} }, close)).toThrow(
      E_WORKER_NETWORK_LEAK
    );
    expect(close).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// AC-002 · requestResource — permission denied when URL not in manifest
// ---------------------------------------------------------------------------

describe("requestResource (AC-002)", () => {
  it("throws E_PERMISSION_DENIED when manifest.permissions.network is empty", () => {
    const audit = vi.fn();
    const manifest = { id: "plugin-a", permissions: { network: [] } };
    expect(() => requestResource("https://example.com/data", manifest, audit)).toThrow(
      E_PERMISSION_DENIED
    );
  });

  it("throws E_PERMISSION_DENIED when manifest.permissions.network is absent", () => {
    const audit = vi.fn();
    const manifest = { id: "plugin-b", permissions: {} };
    expect(() => requestResource("https://example.com/data", manifest, audit)).toThrow(
      E_PERMISSION_DENIED
    );
  });

  it("throws E_PERMISSION_DENIED when URL does not match any allowed pattern", () => {
    const audit = vi.fn();
    const manifest = {
      id: "plugin-c",
      permissions: { network: ["https://allowed.example.com/*"] },
    };
    expect(() => requestResource("https://evil.example.com/steal", manifest, audit)).toThrow(
      E_PERMISSION_DENIED
    );
  });

  it("does not throw when URL matches an allowed pattern", () => {
    const audit = vi.fn();
    const manifest = {
      id: "plugin-d",
      permissions: { network: ["https://example.com/*"] },
    };
    // should complete without throwing
    expect(() => requestResource("https://example.com/data", manifest, audit)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// AC-003 · audit-log records allow:true entry on permitted access
// ---------------------------------------------------------------------------

describe("requestResource audit-log (AC-003)", () => {
  it("calls auditRecord with { allow: true, url, pluginId } when access is allowed", () => {
    const audit = vi.fn();
    const manifest = {
      id: "plugin-e",
      permissions: { network: ["https://api.example.com/*"] },
    };
    const url = "https://api.example.com/items";
    requestResource(url, manifest, audit);

    expect(audit).toHaveBeenCalledOnce();
    const recorded = audit.mock.calls[0][0] as {
      allow: boolean;
      url: string;
      pluginId: string;
      ts: number;
    };
    expect(recorded.allow).toBe(true);
    expect(recorded.url).toBe(url);
    expect(recorded.pluginId).toBe("plugin-e");
    expect(typeof recorded.ts).toBe("number");
  });

  it("does not record an audit entry when access is denied", () => {
    const audit = vi.fn();
    const manifest = { id: "plugin-f", permissions: { network: [] } };
    try {
      requestResource("https://example.com/data", manifest, audit);
    } catch {
      // expected denial
    }
    expect(audit).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AC-003 · AuditLog class stores and retrieves entries
// ---------------------------------------------------------------------------

describe("AuditLog (AC-003)", () => {
  let log: AuditLog;

  beforeEach(() => {
    log = new AuditLog();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getEntries returns an empty array before any record call", () => {
    expect(log.getEntries()).toEqual([]);
  });

  it("record stores an entry and getEntries returns it", () => {
    const entry = { allow: true, url: "https://a.com/", pluginId: "p1", ts: 1000 };
    log.record(entry);
    const entries = log.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(entry);
  });

  it("record appends multiple entries in order", () => {
    const e1 = { allow: true, url: "https://a.com/1", pluginId: "p1", ts: 1000 };
    const e2 = { allow: false, url: "https://b.com/2", pluginId: "p2", ts: 2000 };
    log.record(e1);
    log.record(e2);
    const entries = log.getEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual(e1);
    expect(entries[1]).toEqual(e2);
  });
});

// ---------------------------------------------------------------------------
// AC-004 · violation-detector: timeout detection + fallback payload
// ---------------------------------------------------------------------------

describe("detectTimeout (AC-004)", () => {
  it("returns null when elapsed time is below the limit", () => {
    const result = detectTimeout(0, 4999, 5000);
    expect(result).toBeNull();
  });

  it("returns null when elapsed time equals the limit exactly", () => {
    const result = detectTimeout(0, 5000, 5000);
    expect(result).toBeNull();
  });

  it("returns { type: 'fallback', reason: 'timeout' } when elapsed exceeds limit", () => {
    const result = detectTimeout(0, 5001, 5000);
    expect(result).toEqual({ type: "fallback", reason: "timeout" });
  });

  it("uses startedAt correctly to compute elapsed time", () => {
    const start = 10_000;
    // elapsed = 5001 ms → timeout
    const result = detectTimeout(start, start + 5001, 5000);
    expect(result).toEqual({ type: "fallback", reason: "timeout" });
  });
});

describe("createTimeoutFallback (AC-004)", () => {
  it("returns { type: 'fallback', reason: 'timeout' }", () => {
    const payload = createTimeoutFallback();
    expect(payload.type).toBe("fallback");
    expect(payload.reason).toBe("timeout");
  });
});

// ---------------------------------------------------------------------------
// AC-002 · checkNetworkAccess — URL pattern matching (network-gate unit)
// ---------------------------------------------------------------------------

describe("checkNetworkAccess (AC-002 — network-gate)", () => {
  it("returns false for empty pattern list", () => {
    expect(checkNetworkAccess("https://example.com/data", [])).toBe(false);
  });

  it("returns true when URL matches a wildcard pattern", () => {
    expect(checkNetworkAccess("https://example.com/data", ["https://example.com/*"])).toBe(true);
  });

  it("returns false when URL does not match any pattern", () => {
    expect(checkNetworkAccess("https://evil.com/data", ["https://example.com/*"])).toBe(false);
  });

  it("returns true for exact match pattern", () => {
    expect(
      checkNetworkAccess("https://api.example.com/v1/items", ["https://api.example.com/v1/items"])
    ).toBe(true);
  });

  it("returns false when URL is empty string", () => {
    expect(checkNetworkAccess("", ["https://example.com/*"])).toBe(false);
  });

  it("returns false when all patterns are empty strings", () => {
    expect(checkNetworkAccess("https://example.com/data", [""])).toBe(false);
  });
});
